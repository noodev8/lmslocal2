/*
=======================================================================================================================================
Create Round Route - Create new round for competition
=======================================================================================================================================
Purpose: Create new round for a specific competition
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
API Route: /create-round
=======================================================================================================================================
Method: POST
Purpose: Create a new round for a competition (organiser only)
=======================================================================================================================================
Request Payload:
{
  "competition_id": 123,
  "lock_time": "2025-08-25T14:00:00Z"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Round created successfully",
  "round": {
    "id": 1,
    "round_number": 1,
    "lock_time": "2025-08-25T14:00:00Z",
    "status": "LOCKED",
    "created_at": "2025-08-23T10:00:00Z"
  }
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { competition_id, lock_time } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!competition_id || !Number.isInteger(competition_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Competition ID is required and must be a number"
      });
    }

    if (!lock_time) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Lock time is required"
      });
    }

    // Verify user is the organiser
    const competitionCheck = await pool.query(
      'SELECT organiser_id, name FROM competition WHERE id = $1',
      [competition_id]
    );

    if (competitionCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "COMPETITION_NOT_FOUND",
        message: "Competition not found"
      });
    }

    if (competitionCheck.rows[0].organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can create rounds"
      });
    }

    // Get the next round number
    const maxRoundResult = await pool.query(
      'SELECT COALESCE(MAX(round_number), 0) as max_round FROM round WHERE competition_id = $1',
      [competition_id]
    );
    const nextRoundNumber = maxRoundResult.rows[0].max_round + 1;

    // Create the round
    const result = await pool.query(`
      INSERT INTO round (
        competition_id,
        round_number,
        lock_time,
        status,
        created_at
      )
      VALUES ($1, $2, $3, 'LOCKED', CURRENT_TIMESTAMP)
      RETURNING *
    `, [competition_id, nextRoundNumber, lock_time]);

    const round = result.rows[0];

    // Log the creation
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Round Created', $3)
    `, [
      competition_id,
      user_id,
      `Created Round ${nextRoundNumber} for "${competitionCheck.rows[0].name}" with lock time ${lock_time}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Round created successfully",
      round: {
        id: round.id,
        round_number: round.round_number,
        lock_time: round.lock_time,
        status: round.status,
        created_at: round.created_at
      }
    });

  } catch (error) {
    console.error('Create round error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;