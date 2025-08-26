/*
=======================================================================================================================================
Add Fixtures Bulk Route
=======================================================================================================================================
Method: POST
Purpose: Add multiple fixtures to a round in a single transaction (organiser only)
=======================================================================================================================================
Request Payload:
{
  "competition_id": 123,
  "round_id": 1,
  "fixtures": [
    {
      "home_team_id": 5,
      "away_team_id": 10,
      "kickoff_time": "2025-08-25T15:00:00Z"
    },
    {
      "home_team_id": 12,
      "away_team_id": 7,
      "kickoff_time": "2025-08-25T15:00:00Z"
    }
  ]
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "5 fixtures added successfully",
  "fixtures": [
    {
      "id": 1,
      "home_team": "Arsenal",
      "away_team": "Chelsea",
      "home_team_short": "ARS",
      "away_team_short": "CHE",
      "kickoff_time": "2025-08-25T15:00:00Z"
    },
    ...
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"UNAUTHORIZED"
"NOT_FOUND"
"SERVER_ERROR"
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
    const userId = decoded.user_id || decoded.userId; // Handle both formats
    const result = await pool.query('SELECT id, email, display_name, email_verified FROM app_user WHERE id = $1', [userId]);
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

router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { competition_id, round_id, fixtures } = req.body;
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

    if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Fixtures array is required and must not be empty"
      });
    }

    // Validate each fixture
    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i];
      if (!fixture.home_team_id || !fixture.away_team_id || !fixture.kickoff_time) {
        return res.status(400).json({
          return_code: "VALIDATION_ERROR",
          message: `Fixture ${i + 1}: Home team ID, away team ID, and kickoff time are required`
        });
      }
      
      if (fixture.home_team_id === fixture.away_team_id) {
        return res.status(400).json({
          return_code: "VALIDATION_ERROR",
          message: `Fixture ${i + 1}: Home team and away team must be different`
        });
      }
    }

    // Start transaction
    await client.query('BEGIN');

    // Verify user is the organiser and round exists
    const verifyResult = await client.query(`
      SELECT c.organiser_id, c.name as competition_name, r.round_number
      FROM competition c
      JOIN round r ON c.id = r.competition_id
      WHERE c.id = $1 AND r.id = $2
    `, [competition_id, round_id]);

    if (verifyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Competition or round not found"
      });
    }

    if (verifyResult.rows[0].organiser_id !== user_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can add fixtures"
      });
    }

    // Get all team IDs and validate they exist
    const allTeamIds = [...new Set(fixtures.flatMap(f => [f.home_team_id, f.away_team_id]))];
    const teamResult = await client.query(`
      SELECT id, name, short_name
      FROM team 
      WHERE id = ANY($1) AND is_active = true
    `, [allTeamIds]);

    if (teamResult.rows.length !== allTeamIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "One or more team IDs are invalid or inactive"
      });
    }

    // Create team lookup map
    const teamMap = {};
    teamResult.rows.forEach(team => {
      teamMap[team.id] = team;
    });

    // Check for team conflicts within the round (existing fixtures + new fixtures)
    const existingFixtures = await client.query(`
      SELECT home_team, away_team
      FROM fixture
      WHERE round_id = $1
    `, [round_id]);

    const usedTeams = new Set();
    existingFixtures.rows.forEach(fixture => {
      usedTeams.add(fixture.home_team);
      usedTeams.add(fixture.away_team);
    });

    // Check new fixtures for conflicts
    const newUsedTeams = new Set();
    for (let fixture of fixtures) {
      const homeTeam = teamMap[fixture.home_team_id];
      const awayTeam = teamMap[fixture.away_team_id];
      
      // Check against existing fixtures
      if (usedTeams.has(homeTeam.name)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          return_code: "VALIDATION_ERROR",
          message: `${homeTeam.name} is already playing in this round`
        });
      }
      
      if (usedTeams.has(awayTeam.name)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          return_code: "VALIDATION_ERROR",
          message: `${awayTeam.name} is already playing in this round`
        });
      }
      
      // Check within new fixtures
      if (newUsedTeams.has(homeTeam.name)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          return_code: "VALIDATION_ERROR",
          message: `${homeTeam.name} appears multiple times in the new fixtures`
        });
      }
      
      if (newUsedTeams.has(awayTeam.name)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          return_code: "VALIDATION_ERROR",
          message: `${awayTeam.name} appears multiple times in the new fixtures`
        });
      }
      
      newUsedTeams.add(homeTeam.name);
      newUsedTeams.add(awayTeam.name);
    }

    // Insert all fixtures
    const createdFixtures = [];
    for (let fixture of fixtures) {
      const homeTeam = teamMap[fixture.home_team_id];
      const awayTeam = teamMap[fixture.away_team_id];
      
      const result = await client.query(`
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
      `, [round_id, homeTeam.name, awayTeam.name, homeTeam.short_name, awayTeam.short_name, fixture.kickoff_time]);

      createdFixtures.push(result.rows[0]);
    }

    // Log the creation
    await client.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Bulk Fixtures Added', $3)
    `, [
      competition_id,
      user_id,
      `Added ${fixtures.length} fixtures to Round ${verifyResult.rows[0].round_number}`
    ]);

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      return_code: "SUCCESS",
      message: `${fixtures.length} fixtures added successfully`,
      fixtures: createdFixtures
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk create fixtures error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  } finally {
    client.release();
  }
});

module.exports = router;