/*
=======================================================================================================================================
Add Fixture Route
=======================================================================================================================================
*/

const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        return_code: "UNAUTHORIZED",
        message: "No token provided"
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await pool.query('SELECT id, email, display_name, email_verified FROM app_user WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({
        return_code: "UNAUTHORIZED",
        message: "Invalid token"
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      return_code: "UNAUTHORIZED",
      message: "Invalid token"
    });
  }
};

/*
=======================================================================================================================================
API Route: /add-fixture
=======================================================================================================================================
Method: POST
Purpose: Add a fixture to a round (organiser only)
=======================================================================================================================================
Request Payload:
{
  "competition_id": 123,
  "round_id": 1,
  "home_team_id": 5,
  "away_team_id": 10,
  "kickoff_time": "2025-08-25T15:00:00Z"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Fixture added successfully",
  "fixture": {
    "id": 1,
    "home_team": "Arsenal",
    "away_team": "Chelsea",
    "home_team_short": "ARS",
    "away_team_short": "CHE",
    "kickoff_time": "2025-08-25T15:00:00Z"
  }
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { competition_id, round_id, home_team_id, away_team_id, kickoff_time } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!competition_id || !Number.isInteger(competition_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Competition ID is required and must be a number"
      });
    }

    if (!round_id || !Number.isInteger(round_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Round ID is required and must be a number"
      });
    }

    if (!home_team_id || !away_team_id || !kickoff_time) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Home team ID, away team ID, and kickoff time are required"
      });
    }

    // Validate team IDs are different
    if (home_team_id === away_team_id) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Home team and away team must be different"
      });
    }

    // Verify user is the organiser and round exists
    const verifyResult = await pool.query(`
      SELECT c.organiser_id, c.name as competition_name, r.round_number, r.status
      FROM competition c
      JOIN round r ON c.id = r.competition_id
      WHERE c.id = $1 AND r.id = $2
    `, [competition_id, round_id]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Competition or round not found"
      });
    }

    if (verifyResult.rows[0].organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can add fixtures"
      });
    }

    // Check if round is UNLOCKED (cannot modify fixtures for unlocked rounds)
    if (verifyResult.rows[0].status === 'UNLOCKED') {
      return res.status(400).json({
        return_code: "ROUND_UNLOCKED",
        message: "Cannot modify fixtures for an unlocked round. Lock the round first."
      });
    }

    // Verify team IDs exist and get team details
    const teamVerify = await pool.query(`
      SELECT t1.id as home_id, t1.name as home_name, t1.short_name as home_short,
             t2.id as away_id, t2.name as away_name, t2.short_name as away_short
      FROM team t1, team t2
      WHERE t1.id = $1 AND t2.id = $2 AND t1.is_active = true AND t2.is_active = true
    `, [home_team_id, away_team_id]);

    if (teamVerify.rows.length === 0) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "One or both team IDs are invalid"
      });
    }

    const teams = teamVerify.rows[0];

    // Check if either team is already playing in this round
    const teamConflictCheck = await pool.query(`
      SELECT home_team, away_team
      FROM fixture
      WHERE round_id = $1 
        AND (home_team = $2 OR away_team = $2 OR home_team = $3 OR away_team = $3)
    `, [round_id, teams.home_name, teams.away_name]);

    if (teamConflictCheck.rows.length > 0) {
      const conflictingTeam = teamConflictCheck.rows[0].home_team === teams.home_name || teamConflictCheck.rows[0].away_team === teams.home_name ? teams.home_name : teams.away_name;
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: `${conflictingTeam} is already playing in this round`
      });
    }

    // Check if fixture kickoff is before round lock time
    const roundLockCheck = await pool.query(`
      SELECT lock_time FROM round WHERE id = $1
    `, [round_id]);

    let warning = null;
    if (roundLockCheck.rows.length > 0) {
      const lockTime = new Date(roundLockCheck.rows[0].lock_time);
      const fixtureKickoff = new Date(kickoff_time);
      
      if (fixtureKickoff < lockTime) {
        const formattedKickoff = fixtureKickoff.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        const formattedLockTime = lockTime.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        warning = `Warning: Fixture kicks off at ${formattedKickoff} but round locks at ${formattedLockTime}.`;
      }
    }

    // Create the fixture (using current schema with varchar team names)
    const result = await pool.query(`
      INSERT INTO fixture (
        round_id,
        home_team,
        away_team,
        home_team_short,
        away_team_short,
        kickoff_time,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [round_id, teams.home_name, teams.away_name, teams.home_short, teams.away_short, kickoff_time]);

    const fixture = result.rows[0];

    // Log the creation
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Fixture Added', $3)
    `, [
      competition_id,
      user_id,
      `Added fixture ${teams.home_name} vs ${teams.away_name} to Round ${verifyResult.rows[0].round_number}`
    ]);

    const response = {
      return_code: "SUCCESS",
      message: "Fixture added successfully",
      fixture: fixture
    };

    if (warning) {
      response.warning = warning;
    }

    res.json(response);

  } catch (error) {
    console.error('Create fixture error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;