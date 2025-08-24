/*
=======================================================================================================================================
Forgot Password Route
=======================================================================================================================================
*/

const express = require('express');
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
API Route: /forgot-password
=======================================================================================================================================
Method: POST
Purpose: Send password reset email
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com"
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "If an account with this email exists, a password reset link has been sent"
}
=======================================================================================================================================
*/
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Email is required"
      });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, display_name FROM app_user WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({
        return_code: "SUCCESS",
        message: "If an account with this email exists, a password reset link has been sent"
      });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = tokenUtils.generateToken('reset_');
    const tokenExpiry = tokenUtils.getTokenExpiry(1); // 1 hour

    // Update user with reset token
    await pool.query(
      'UPDATE app_user SET auth_token = $1, auth_token_expires = $2, updated_at = NOW() WHERE id = $3',
      [resetToken, tokenExpiry, user.id]
    );

    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(email.toLowerCase(), resetToken, user.display_name);
    
    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      // Don't reveal email sending failure for security
    }

    res.json({
      return_code: "SUCCESS",
      message: "If an account with this email exists, a password reset link has been sent"
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;