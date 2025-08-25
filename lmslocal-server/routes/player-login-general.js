/*
=======================================================================================================================================
General Player Login Route - Login without specific competition
=======================================================================================================================================
*/

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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
API Route: /player-login-general
=======================================================================================================================================
Method: POST
Purpose: General player login - returns user data and JWT for accessing competitions
=======================================================================================================================================
Request Payload:
{
  "email": "player@email.com",
  "password": "password123"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Login successful",
  "user": {
    "id": 12,
    "display_name": "John Smith",
    "email": "player@email.com"
  },
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
=======================================================================================================================================
*/
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Email is required"
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Password is required"
      });
    }

    // Find user by email and check password
    const userResult = await pool.query(`
      SELECT id, email, display_name, password_hash
      FROM app_user 
      WHERE email = $1
    `, [email.toLowerCase().trim()]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        return_code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      });
    }

    const user = userResult.rows[0];

    // Check password using bcrypt
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(400).json({
        return_code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      });
    }

    // Generate general JWT token (no specific competition)
    const jwtPayload = { 
      user_id: user.id,
      email: user.email,
      display_name: user.display_name
    };
    
    const jwtToken = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last active time
    await pool.query(`
      UPDATE app_user 
      SET last_active_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    res.json({
      return_code: "SUCCESS",
      message: "Login successful",
      user: {
        id: user.id,
        display_name: user.display_name,
        email: user.email
      },
      jwt_token: jwtToken
    });

  } catch (error) {
    console.error('Player general login error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;