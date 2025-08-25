/*
=======================================================================================================================================
Get Teams Route - Get teams for a specific team list
=======================================================================================================================================
Purpose: Retrieve all active teams for a specific team list
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
API Route: /get-teams
=======================================================================================================================================
Method: POST
Purpose: Get all active teams for a specific team list
=======================================================================================================================================
Request Payload:
{
  "team_list_id": 1
}

Success Response:
{
  "return_code": "SUCCESS",
  "teams": [
    {
      "id": 1,
      "name": "Arsenal",
      "short_name": "ARS"
    }
  ]
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { team_list_id } = req.body;

    // Basic validation
    if (!team_list_id || !Number.isInteger(team_list_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Team list ID is required and must be a number"
      });
    }

    // Get teams for this team list
    const result = await pool.query(`
      SELECT 
        id,
        name,
        short_name
      FROM team
      WHERE team_list_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [team_list_id]);

    res.json({
      return_code: "SUCCESS",
      teams: result.rows
    });

  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;