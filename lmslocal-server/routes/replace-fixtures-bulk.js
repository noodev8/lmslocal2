/*
=======================================================================================================================================
Replace Fixtures Bulk Route
=======================================================================================================================================
Method: POST
Purpose: Replace ALL fixtures in a round with new ones (delete existing, add new) - organiser only
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
  "message": "Fixtures replaced successfully",
  "fixtures_count": 5,
  "deleted_count": 3,
  "added_count": 5
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

    if (!fixtures || !Array.isArray(fixtures)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Fixtures array is required"
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
        message: "Only the competition organiser can replace fixtures"
      });
    }

    // Delete all existing fixtures in this round
    const deleteResult = await client.query(`
      DELETE FROM fixture WHERE round_id = $1
      RETURNING id
    `, [round_id]);
    
    const deletedCount = deleteResult.rows.length;

    let addedCount = 0;

    if (fixtures.length > 0) {
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

      // Check for duplicate teams within the new fixtures
      const usedTeams = new Set();
      for (let fixture of fixtures) {
        const homeTeam = teamMap[fixture.home_team_id];
        const awayTeam = teamMap[fixture.away_team_id];
        
        if (usedTeams.has(homeTeam.name)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            return_code: "VALIDATION_ERROR",
            message: `${homeTeam.name} appears multiple times in the fixtures`
          });
        }
        
        if (usedTeams.has(awayTeam.name)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            return_code: "VALIDATION_ERROR",
            message: `${awayTeam.name} appears multiple times in the fixtures`
          });
        }
        
        usedTeams.add(homeTeam.name);
        usedTeams.add(awayTeam.name);
      }

      // Insert all new fixtures
      for (let fixture of fixtures) {
        const homeTeam = teamMap[fixture.home_team_id];
        const awayTeam = teamMap[fixture.away_team_id];
        
        await client.query(`
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
        `, [round_id, homeTeam.name, awayTeam.name, homeTeam.short_name, awayTeam.short_name, fixture.kickoff_time]);

        addedCount++;
      }
    }

    // Log the replacement
    await client.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Fixtures Replaced', $3)
    `, [
      competition_id,
      user_id,
      `Replaced fixtures in Round ${verifyResult.rows[0].round_number}: deleted ${deletedCount}, added ${addedCount}`
    ]);

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      return_code: "SUCCESS",
      message: "Fixtures replaced successfully",
      fixtures_count: addedCount,
      deleted_count: deletedCount,
      added_count: addedCount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Replace fixtures error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  } finally {
    client.release();
  }
});

module.exports = router;