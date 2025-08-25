/*
=======================================================================================================================================
API Route: login
=======================================================================================================================================
Method: POST
Purpose: Authenticate user login with email and password
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com",                // string, required
  "password": "password123"                   // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Login successful",
  "user": {
    "user_id": 123,                          // number, user ID
    "email": "user@example.com",             // string, user email
    "display_name": "John Doe",              // string, user display name
    "email_verified": true                   // boolean, email verification status
  },
  "token": "jwt.token.here"                  // string, JWT authentication token
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"INVALID_CREDENTIALS"
"EMAIL_NOT_VERIFIED"
"MISSING_REQUIRED_FIELDS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const bcrypt = require('bcrypt');
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

router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        return_code: 'MISSING_REQUIRED_FIELDS',
        message: 'Email and password are required'
      });
    }

    // Dev shortcut: "a" = auto login as your account
    let loginEmail = email;
    let loginPassword = password;
    
    if (email.trim() === 'a' && password.trim() === 'a') {
      loginEmail = 'aandreou25@gmail.com';
      loginPassword = '12345678';
      console.log('🚀 Server-side dev shortcut activated! Logging in as aandreou25@gmail.com');
    }

    // Email format validation (skip for dev shortcut)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      return res.status(400).json({
        return_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, display_name, password_hash, email_verified FROM app_user WHERE email = $1',
      [loginEmail.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        return_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordValid = await bcrypt.compare(loginPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        return_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({
        return_code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.id, 
        email: user.email,
        display_name: user.display_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Update last login timestamp  
    await pool.query(
      'UPDATE app_user SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Success response
    res.json({
      return_code: 'SUCCESS',
      message: 'Login successful',
      user: {
        user_id: user.id,
        email: user.email,
        display_name: user.display_name,
        email_verified: user.email_verified
      },
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      return_code: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

module.exports = router;