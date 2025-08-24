/*
=======================================================================================================================================
Lock Unlock Round Route
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
API Route: /lock-unlock-round
=======================================================================================================================================
Method: POST
Purpose: Change round status (LOCK/UNLOCK) - Admin action from status flow
=======================================================================================================================================
Request Payload:
{
  "competition_id": 123,
  "round_id": 1,
  "status": "LOCKED"
}

OR

{
  "competition_id": 123,
  "round_id": 1,
  "status": "UNLOCKED"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Round 1 locked successfully",
  "round": {
    "id": 1,
    "round_number": 1,
    "status": "LOCKED",
    "lock_time": "2025-08-25T14:00:00Z"
  }
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { competition_id, round_id, status } = req.body;
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

    // Validate status
    if (!status || !['UNLOCKED', 'LOCKED'].includes(status)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Status must be either UNLOCKED or LOCKED"
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
        message: "Only the competition organiser can change round status"
      });
    }

    // Update round status
    const result = await pool.query(`
      UPDATE round 
      SET status = $1 
      WHERE id = $2 AND competition_id = $3
      RETURNING *
    `, [status, round_id, competition_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        return_code: "ROUND_NOT_FOUND",
        message: "Round not found"
      });
    }

    const round = result.rows[0];

    // Log the action
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Round Status Changed', $3)
    `, [
      competition_id,
      user_id,
      `Changed Round ${round.round_number} status to ${status}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: `Round ${round.round_number} ${status === 'UNLOCKED' ? 'unlocked' : 'locked'} successfully`,
      round: {
        id: round.id,
        round_number: round.round_number,
        status: round.status,
        lock_time: round.lock_time,
        created_at: round.created_at
      }
    });

  } catch (error) {
    console.error('Change round status error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;