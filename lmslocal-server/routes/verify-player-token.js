/*
=======================================================================================================================================
Verify Player Token Route - Handle magic link authentication
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

/*
=======================================================================================================================================
API Route: /verify-player-token
=======================================================================================================================================
Method: POST
Purpose: Verify magic link token and authenticate player
=======================================================================================================================================
Request Payload:
{
  "token": "xyz123",
  "slug": "10001"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Authentication successful",
  "user": {
    "id": 456,
    "display_name": "John Smith",
    "email": "john@email.com"
  },
  "competition": {
    "id": 123,
    "name": "Premier League Survivor",
    "slug": "10001"
  },
  "player_status": {
    "lives_remaining": 1,
    "status": "active",
    "joined_at": "2025-08-25T10:00:00Z"
  },
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
=======================================================================================================================================
*/
router.post('/', async (req, res) => {
  try {
    const { token, slug } = req.body;

    // Basic validation
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Token is required"
      });
    }

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Slug is required"
      });
    }

    // Find user by token
    const userResult = await pool.query(`
      SELECT id, email, display_name, auth_token_expires
      FROM app_user 
      WHERE auth_token = $1
    `, [token]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        return_code: "INVALID_TOKEN",
        message: "Invalid or expired magic link"
      });
    }

    const user = userResult.rows[0];

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(user.auth_token_expires);
    
    if (now > expiresAt) {
      return res.status(400).json({
        return_code: "TOKEN_EXPIRED", 
        message: "Magic link has expired. Please request a new one."
      });
    }

    // Get competition by slug
    const competitionResult = await pool.query(`
      SELECT id, name, slug, status
      FROM competition
      WHERE slug = $1
    `, [slug]);

    if (competitionResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "COMPETITION_NOT_FOUND",
        message: "Competition not found"
      });
    }

    const competition = competitionResult.rows[0];

    // Get player status in this competition
    const playerStatusResult = await pool.query(`
      SELECT status, lives_remaining, joined_at
      FROM competition_user
      WHERE competition_id = $1 AND user_id = $2
    `, [competition.id, user.id]);

    if (playerStatusResult.rows.length === 0) {
      return res.status(400).json({
        return_code: "NOT_JOINED",
        message: "User has not joined this competition"
      });
    }

    const playerStatus = playerStatusResult.rows[0];

    // Clear the magic link token (one-time use)
    await pool.query(`
      UPDATE app_user 
      SET auth_token = NULL, auth_token_expires = NULL, last_active_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Generate JWT token for session
    const jwtPayload = { 
      user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      competition_id: competition.id,
      slug: competition.slug
    };
    
    
    const jwtToken = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful authentication
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Player Authentication', $3)
    `, [
      competition.id,
      user.id,
      `Player "${user.display_name}" authenticated via magic link for "${competition.name}"`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Authentication successful",
      user: {
        id: user.id,
        display_name: user.display_name,
        email: user.email
      },
      competition: {
        id: competition.id,
        name: competition.name,
        slug: competition.slug,
        status: competition.status
      },
      player_status: {
        lives_remaining: playerStatus.lives_remaining,
        status: playerStatus.status,
        joined_at: playerStatus.joined_at
      },
      jwt_token: jwtToken
    });

  } catch (error) {
    console.error('Verify player token error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;