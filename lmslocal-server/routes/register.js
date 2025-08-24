/*
=======================================================================================================================================
Register Route
=======================================================================================================================================
*/

const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const emailService = require('../services/emailService');
const tokenUtils = require('../utils/tokenUtils');
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
API Route: /register
=======================================================================================================================================
Method: POST
Purpose: Register a new user account
=======================================================================================================================================
Request Payload:
{
  "display_name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Registration successful. Please check your email to verify your account.",
  "user_id": 123
}
=======================================================================================================================================
*/
router.post('/', async (req, res) => {
  try {
    const { display_name, email, password } = req.body;

    // Validation
    if (!display_name || !email || !password) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Display name, email, and password are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Password must be at least 8 characters long"
      });
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Please enter a valid email address"
      });
    }

    // Check if email already exists
    const existingUser = await pool.query('SELECT id FROM app_user WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        return_code: "EMAIL_EXISTS",
        message: "An account with this email already exists"
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = tokenUtils.generateToken('verify_');
    const tokenExpiry = tokenUtils.getTokenExpiry(24); // 24 hours

    // Create user
    const result = await pool.query(
      'INSERT INTO app_user (display_name, email, password_hash, email_verified, auth_token, auth_token_expires, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id',
      [display_name, email.toLowerCase(), hashedPassword, false, verificationToken, tokenExpiry]
    );

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(email.toLowerCase(), verificationToken, display_name);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails - user can resend later
    }

    res.json({
      return_code: "SUCCESS",
      message: "Registration successful. Please check your email to verify your account.",
      user_id: result.rows[0].id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;