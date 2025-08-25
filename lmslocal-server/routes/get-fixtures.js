/*
=======================================================================================================================================
Get Fixtures Route - Get fixtures for a specific round
=======================================================================================================================================
Purpose: Retrieve all fixtures for a specific round
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
API Route: /get-fixtures
=======================================================================================================================================
Method: POST
Purpose: Get all fixtures for a specific round
=======================================================================================================================================
Request Payload:
{
  "round_id": 123
}

Success Response:
{
  "return_code": "SUCCESS",
  "fixtures": [
    {
      "id": 1,
      "home_team": "Arsenal",
      "away_team": "Chelsea", 
      "home_team_short": "ARS",
      "away_team_short": "CHE",
      "kickoff_time": "2025-08-25T15:00:00Z",
      "status": "pending"
    }
  ]
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { round_id } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!round_id || !Number.isInteger(round_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Round ID is required and must be a number"
      });
    }

    // Get fixtures for this round - teams are stored as strings in fixture table
    const result = await pool.query(`
      SELECT 
        f.id,
        f.kickoff_time,
        f.result,
        f.home_team,
        f.away_team,
        f.home_team_short,
        f.away_team_short
      FROM fixture f
      WHERE f.round_id = $1
      ORDER BY f.kickoff_time ASC
    `, [round_id]);

    res.json({
      return_code: "SUCCESS",
      fixtures: result.rows.map(row => ({
        id: row.id,
        home_team: row.home_team,
        away_team: row.away_team,
        home_team_short: row.home_team_short,
        away_team_short: row.away_team_short,
        kickoff_time: row.kickoff_time,
        result: row.result // Will be team short name (e.g. "ARS") or "DRAW" or null
      }))
    });

  } catch (error) {
    console.error('Get fixtures error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;