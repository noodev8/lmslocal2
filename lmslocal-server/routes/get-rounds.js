/*
=======================================================================================================================================
Get Rounds Route - Get rounds for a specific competition
=======================================================================================================================================
Purpose: Retrieve all rounds for a specific competition with fixture count
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
API Route: /get-rounds
=======================================================================================================================================
Method: POST
Purpose: Get all rounds for a specific competition
=======================================================================================================================================
Request Payload:
{
  "competition_id": 123
}

Success Response:
{
  "return_code": "SUCCESS",
  "rounds": [
    {
      "id": 1,
      "round_number": 1,
      "lock_time": "2025-08-25T15:00:00Z",
      "status": "LOCKED",
      "fixture_count": 10
    }
  ]
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { competition_id } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!competition_id || !Number.isInteger(competition_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Competition ID is required and must be a number"
      });
    }

    // First check if competition exists
    const competitionCheck = await pool.query(`
      SELECT c.id, c.name, c.organiser_id
      FROM competition c
      WHERE c.id = $1
    `, [competition_id]);

    if (competitionCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Competition not found"
      });
    }

    const competition = competitionCheck.rows[0];

    // Check if user has access (either organiser or participant)
    if (competition.organiser_id !== user_id) {
      const participantCheck = await pool.query(`
        SELECT user_id FROM competition_user WHERE competition_id = $1 AND user_id = $2
      `, [competition_id, user_id]);

      if (participantCheck.rows.length === 0) {
        return res.status(403).json({
          return_code: "ACCESS_DENIED",
          message: "You do not have access to this competition"
        });
      }
    }

    // Get rounds with fixture count
    const result = await pool.query(`
      SELECT 
        r.id,
        r.round_number,
        r.lock_time,
        COUNT(f.id) as fixture_count
      FROM round r
      LEFT JOIN fixture f ON r.id = f.round_id
      WHERE r.competition_id = $1
      GROUP BY r.id, r.round_number, r.lock_time
      ORDER BY r.round_number DESC
    `, [competition_id]);

    res.json({
      return_code: "SUCCESS",
      rounds: result.rows.map(row => ({
        id: row.id,
        round_number: row.round_number,
        lock_time: row.lock_time,
        fixture_count: parseInt(row.fixture_count)
      }))
    });

  } catch (error) {
    console.error('Get rounds error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;