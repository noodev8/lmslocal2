/*
=======================================================================================================================================
Set Pick Route
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
API Route: /set-pick
=======================================================================================================================================
Method: POST
Purpose: Make or update a pick for a round
=======================================================================================================================================
Request Payload:
{
  "fixture_id": 16,
  "team": "home",
  "user_id": 456
}

OR

{
  "fixture_id": 16,
  "team": "away",
  "user_id": 456
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Pick saved successfully",
  "pick": {
    "id": 1,
    "team": "Arsenal",
    "fixture_id": 16,
    "locked": false,
    "created_at": "2025-08-24T21:00:00Z"
  }
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { fixture_id, team, user_id } = req.body;
    const authenticated_user_id = req.user.id;

    // Basic validation
    if (!fixture_id || !Number.isInteger(fixture_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Fixture ID is required and must be a number"
      });
    }

    if (!team || !['home', 'away'].includes(team)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Team must be 'home' or 'away'"
      });
    }

    if (!user_id || !Number.isInteger(user_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "User ID is required and must be a number"
      });
    }

    // Get fixture details and related competition/round info
    const fixtureCheck = await pool.query(`
      SELECT f.id, f.home_team, f.away_team, f.home_team_short, f.away_team_short, f.round_id,
             r.competition_id, r.lock_time, r.status as round_status, r.round_number,
             c.organiser_id, c.name as competition_name
      FROM fixture f
      JOIN round r ON f.round_id = r.id
      JOIN competition c ON r.competition_id = c.id
      WHERE f.id = $1
    `, [fixture_id]);

    if (fixtureCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "FIXTURE_NOT_FOUND",
        message: "Fixture not found"
      });
    }

    const fixtureInfo = fixtureCheck.rows[0];
    const competition_id = fixtureInfo.competition_id;
    const round_id = fixtureInfo.round_id;

    const isAdmin = fixtureInfo.organiser_id === authenticated_user_id;
    const isOwnPick = user_id === authenticated_user_id;

    if (!isAdmin && !isOwnPick) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "You can only set your own pick unless you are the competition organiser"
      });
    }

    // Verify target user is part of the competition
    const memberCheck = await pool.query(`
      SELECT cu.status
      FROM competition_user cu
      WHERE cu.competition_id = $1 AND cu.user_id = $2
    `, [competition_id, user_id]);
    

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Target user is not part of this competition"
      });
    }

    // Check if round status is UNLOCKED (no picks allowed on LOCKED rounds, even for admins)
    if (fixtureInfo.round_status !== 'UNLOCKED') {
      return res.status(400).json({
        return_code: "ROUND_NOT_READY",
        message: "This round is locked. Unlock the round first to allow picks."
      });
    }

    // Allow admins to override time restrictions only (but not round status)
    if (!isAdmin) {
      const now = new Date();
      const lockTime = new Date(fixtureInfo.lock_time);
      if (now >= lockTime) {
        return res.status(400).json({
          return_code: "ROUND_LOCKED",
          message: "This round is locked and picks cannot be changed"
        });
      }
    }


    // Determine team name from fixture info
    const teamName = team === 'home' ? fixtureInfo.home_team_short : fixtureInfo.away_team_short;

    // Check if team was already picked in previous rounds (no team twice rule)
    const previousPickCheck = await pool.query(`
      SELECT p.team
      FROM pick p
      JOIN round r ON p.round_id = r.id
      WHERE r.competition_id = $1 AND p.user_id = $2 AND p.team = $3
    `, [competition_id, user_id, teamName]);

    if (previousPickCheck.rows.length > 0) {
      return res.status(400).json({
        return_code: "TEAM_ALREADY_PICKED",
        message: "You have already picked this team in a previous round"
      });
    }

    // Insert or update the pick
    const result = await pool.query(`
      INSERT INTO pick (round_id, user_id, team, fixture_id, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (round_id, user_id)
      DO UPDATE SET team = $3, fixture_id = $4, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [round_id, user_id, teamName, fixture_id]);

    const pick = result.rows[0];

    // Log the pick
    const logDetails = isAdmin && !isOwnPick 
      ? `Admin set pick: ${teamName} for User ${user_id} in Round ${fixtureInfo.round_number}`
      : `Picked ${teamName} for Round ${fixtureInfo.round_number}`;
      
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Pick Made', $3)
    `, [
      competition_id,
      authenticated_user_id,
      logDetails
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Pick saved successfully",
      pick: {
        id: pick.id,
        team: pick.team,
        fixture_id: pick.fixture_id,
        created_at: pick.created_at
      }
    });

  } catch (error) {
    console.error('Set pick error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;