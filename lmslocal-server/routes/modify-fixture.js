/*
=======================================================================================================================================
Modify Fixture Route - Update fixture details
=======================================================================================================================================
Purpose: Update kickoff time and other details for an existing fixture
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

/*
=======================================================================================================================================
API Route: /modify-fixture
=======================================================================================================================================
Method: POST
Purpose: Update fixture kickoff time (organiser only)
=======================================================================================================================================
Request Payload:
{
  "fixture_id": 123,
  "kickoff_time": "2025-08-30T15:00:00Z"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Fixture updated successfully",
  "fixture": {
    "id": 123,
    "home_team": "Arsenal",
    "away_team": "Chelsea",
    "home_team_short": "ARS",
    "away_team_short": "CHE",
    "kickoff_time": "2025-08-30T15:00:00Z"
  }
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { fixture_id, kickoff_time } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!fixture_id || !Number.isInteger(fixture_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Fixture ID is required and must be a number"
      });
    }

    if (!kickoff_time) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Kickoff time is required"
      });
    }

    // Verify fixture exists and user is the organiser
    const verifyResult = await pool.query(`
      SELECT f.id, f.round_id, c.organiser_id, c.name as competition_name, r.round_number
      FROM fixture f
      JOIN round r ON f.round_id = r.id
      JOIN competition c ON r.competition_id = c.id
      WHERE f.id = $1
    `, [fixture_id]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Fixture not found"
      });
    }

    const fixtureData = verifyResult.rows[0];

    if (fixtureData.organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can modify fixtures"
      });
    }


    // Update the fixture
    const result = await pool.query(`
      UPDATE fixture 
      SET kickoff_time = $1
      WHERE id = $2
      RETURNING *
    `, [kickoff_time, fixture_id]);

    const updatedFixture = result.rows[0];

    // Log the modification
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Fixture Modified', $3)
    `, [
      fixtureData.competition_id,
      user_id,
      `Modified fixture ${updatedFixture.home_team} vs ${updatedFixture.away_team} kickoff time to ${new Date(kickoff_time).toLocaleString()}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Fixture updated successfully",
      fixture: updatedFixture
    });

  } catch (error) {
    console.error('Modify fixture error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;