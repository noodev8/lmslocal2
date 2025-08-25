/*
=======================================================================================================================================
Team Lists Route - Get available team lists
=======================================================================================================================================
Purpose: Get list of available team lists for competition creation
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
API Route: /team-lists
=======================================================================================================================================
Method: GET
Purpose: Get list of available team lists for competition creation
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "team_lists": [
    {
      "id": 1,
      "name": "Premier League 2024/25",
      "type": "football",
      "season": "2024/25",
      "team_count": 20
    }
  ]
}
=======================================================================================================================================
*/
router.get('/', verifyToken, async (req, res) => {
  try {
    // Get active team lists with team counts
    const result = await pool.query(`
      SELECT 
        tl.id,
        tl.name,
        tl.type,
        tl.season,
        COUNT(t.id) as team_count
      FROM team_list tl
      LEFT JOIN team t ON t.team_list_id = tl.id AND t.is_active = true
      WHERE tl.is_active = true
      GROUP BY tl.id, tl.name, tl.type, tl.season
      ORDER BY tl.name
    `);

    res.json({
      return_code: "SUCCESS",
      team_lists: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        season: row.season,
        team_count: parseInt(row.team_count)
      }))
    });

  } catch (error) {
    console.error('Team lists error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;