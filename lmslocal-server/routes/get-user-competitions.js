/*
=======================================================================================================================================
Get User Competitions Route - Get all competitions user is member of
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

// Middleware to verify general player JWT token
const verifyGeneralPlayerToken = async (req, res, next) => {
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
    
    // Handle both admin token format (user_id) and player token format (user_id)
    const userId = decoded.user_id || decoded.userId;
    
    // Get user from database
    const result = await pool.query('SELECT id, email, display_name FROM app_user WHERE id = $1', [userId]);
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
API Route: /get-user-competitions
=======================================================================================================================================
Method: POST
Purpose: Get all competitions that the authenticated user is a member of
=======================================================================================================================================
Request Headers:
Authorization: Bearer JWT_TOKEN

Success Response:
{
  "return_code": "SUCCESS",
  "competitions": [
    {
      "id": 22,
      "name": "Premier League",
      "slug": "10001", 
      "status": "LOCKED",
      "team_list_name": "English Premier League 2025-26",
      "player_status": {
        "lives_remaining": 2,
        "status": "active",
        "joined_at": "2025-08-25T10:00:00Z"
      }
    }
  ]
}
=======================================================================================================================================
*/
router.post('/', verifyGeneralPlayerToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    // Get all competitions user is member of with their status
    const competitionsResult = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.status,
        c.lives_per_player,
        c.no_team_twice,
        tl.name as team_list_name,
        cu.status as player_status,
        cu.lives_remaining,
        cu.joined_at,
        COUNT(cu2.user_id) as player_count
      FROM competition c
      JOIN competition_user cu ON c.id = cu.competition_id
      JOIN team_list tl ON c.team_list_id = tl.id
      LEFT JOIN competition_user cu2 ON c.id = cu2.competition_id
      WHERE cu.user_id = $1
      GROUP BY c.id, c.name, c.slug, c.status, c.lives_per_player, c.no_team_twice, tl.name, cu.status, cu.lives_remaining, cu.joined_at
      ORDER BY cu.joined_at DESC
    `, [user_id]);

    const competitions = competitionsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      team_list_name: row.team_list_name,
      player_count: parseInt(row.player_count),
      player_status: {
        lives_remaining: row.lives_remaining,
        status: row.player_status,
        joined_at: row.joined_at
      }
    }));

    res.json({
      return_code: "SUCCESS",
      competitions: competitions
    });

  } catch (error) {
    console.error('Get user competitions error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;