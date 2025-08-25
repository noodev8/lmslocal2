/*
=======================================================================================================================================
Get Competition by Slug Route - For player-side access
=======================================================================================================================================
*/

const express = require('express');
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

/*
=======================================================================================================================================
API Route: /get-competition-by-slug
=======================================================================================================================================
Method: POST
Purpose: Get public competition information for players using slug
=======================================================================================================================================
Request Payload:
{
  "slug": "10001"
}

Success Response:
{
  "return_code": "SUCCESS",
  "competition": {
    "id": 123,
    "name": "Premier League Survivor",
    "description": "Weekly elimination competition",
    "status": "LOCKED",
    "lives_per_player": 1,
    "no_team_twice": true,
    "team_list_name": "Premier League 2024/25",
    "player_count": 25,
    "slug": "10001",
    "created_at": "2025-08-25T10:00:00Z"
  }
}
=======================================================================================================================================
*/
router.post('/', async (req, res) => {
  try {
    const { slug } = req.body;

    // Basic validation
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Slug is required and must be a string"
      });
    }

    // Get competition by slug with team list and player count
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.status,
        c.lives_per_player,
        c.no_team_twice,
        c.slug,
        c.created_at,
        tl.name as team_list_name,
        COUNT(cu.user_id) as player_count
      FROM competition c
      JOIN team_list tl ON c.team_list_id = tl.id
      LEFT JOIN competition_user cu ON c.id = cu.competition_id
      WHERE c.slug = $1
      GROUP BY c.id, c.name, c.description, c.status, c.lives_per_player, c.no_team_twice, c.slug, c.created_at, tl.name
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        return_code: "COMPETITION_NOT_FOUND",
        message: "Competition not found with this slug"
      });
    }

    const competition = result.rows[0];

    res.json({
      return_code: "SUCCESS",
      competition: {
        id: competition.id,
        name: competition.name,
        description: competition.description,
        status: competition.status,
        lives_per_player: competition.lives_per_player,
        no_team_twice: competition.no_team_twice,
        team_list_name: competition.team_list_name,
        player_count: parseInt(competition.player_count),
        slug: competition.slug,
        created_at: competition.created_at
      }
    });

  } catch (error) {
    console.error('Get competition by slug error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;