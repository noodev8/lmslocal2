/*
=======================================================================================================================================
Delete Fixture Route
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
API Route: /delete-fixture
=======================================================================================================================================
Method: POST
Purpose: Delete a specific fixture
=======================================================================================================================================
Request Payload:
{
  "fixture_id": 16
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Fixture deleted successfully"
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { fixture_id } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!fixture_id || !Number.isInteger(fixture_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Fixture ID is required and must be a number"
      });
    }

    // Verify user is the organiser and get fixture details
    const verifyResult = await pool.query(`
      SELECT c.organiser_id, c.name as competition_name, r.round_number, r.status,
             f.home_team, f.away_team, r.competition_id
      FROM competition c
      JOIN round r ON c.id = r.competition_id
      JOIN fixture f ON r.id = f.round_id
      WHERE f.id = $1
    `, [fixture_id]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Fixture not found"
      });
    }

    const fixture = verifyResult.rows[0];

    if (fixture.organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can delete fixtures"
      });
    }

    // Check if round is UNLOCKED (cannot modify fixtures for unlocked rounds)
    if (fixture.status === 'UNLOCKED') {
      return res.status(400).json({
        return_code: "ROUND_UNLOCKED",
        message: "Cannot modify fixtures for an unlocked round. Lock the round first."
      });
    }

    // Delete the fixture
    await pool.query('DELETE FROM fixture WHERE id = $1', [fixture_id]);

    // Log the deletion
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Fixture Deleted', $3)
    `, [
      fixture.competition_id,
      user_id,
      `Deleted fixture ${fixture.home_team} vs ${fixture.away_team} from Round ${fixture.round_number}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Fixture deleted successfully"
    });

  } catch (error) {
    console.error('Delete fixture error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;