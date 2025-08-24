/*
=======================================================================================================================================
Set Fixture Result Route
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
API Route: /set-fixture-result
=======================================================================================================================================
Method: POST
Purpose: Set result for a fixture
=======================================================================================================================================
Request Payload:
{
  "fixture_id": 16,
  "result": "home_win"
}

OR

{
  "fixture_id": 17,
  "result": "away_win"
}

OR

{
  "fixture_id": 18,
  "result": "draw"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Fixture result set successfully",
  "fixture": {
    "id": 16,
    "home_team": "Arsenal",
    "away_team": "Aston Villa",
    "home_team_short": "ARS",
    "away_team_short": "AVL",
    "result": "ARS"
  }
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { fixture_id, result } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!fixture_id || !Number.isInteger(fixture_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Fixture ID is required and must be a number"
      });
    }

    if (!result || !['home_win', 'away_win', 'draw'].includes(result)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Result must be 'home_win', 'away_win', or 'draw'"
      });
    }

    // Get fixture details and verify user is organiser
    const fixtureCheck = await pool.query(`
      SELECT f.id, f.home_team, f.away_team, f.home_team_short, f.away_team_short, f.round_id,
             r.competition_id, r.round_number, r.status, c.organiser_id, c.name as competition_name
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

    const fixture = fixtureCheck.rows[0];

    if (fixture.organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can set fixture results"
      });
    }

    // Check if round is UNLOCKED (cannot set results for unlocked rounds)
    if (fixture.status === 'UNLOCKED') {
      return res.status(400).json({
        return_code: "ROUND_UNLOCKED",
        message: "Cannot set fixture results for an unlocked round. Lock the round first."
      });
    }

    // Determine result string for database storage
    let resultString;
    if (result === 'home_win') {
      resultString = fixture.home_team_short;
    } else if (result === 'away_win') {
      resultString = fixture.away_team_short;
    } else {
      resultString = 'DRAW';
    }

    // Update fixture with result
    const updateResult = await pool.query(`
      UPDATE fixture 
      SET result = $1
      WHERE id = $2
      RETURNING *
    `, [resultString, fixture_id]);

    const updatedFixture = updateResult.rows[0];

    // Log the action
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Fixture Result Set', $3)
    `, [
      fixture.competition_id,
      user_id,
      `Set result for ${fixture.home_team} vs ${fixture.away_team} in Round ${fixture.round_number}: ${resultString}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Fixture result set successfully",
      fixture: {
        id: updatedFixture.id,
        home_team: updatedFixture.home_team,
        away_team: updatedFixture.away_team,
        home_team_short: updatedFixture.home_team_short,
        away_team_short: updatedFixture.away_team_short,
        result: updatedFixture.result,
        kickoff_time: updatedFixture.kickoff_time
      }
    });

  } catch (error) {
    console.error('Set fixture result error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;