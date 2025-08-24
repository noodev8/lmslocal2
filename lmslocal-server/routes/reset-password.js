/*
=======================================================================================================================================
Reset Password Route
=======================================================================================================================================
*/

const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
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
API Route: /reset-password (GET)
=======================================================================================================================================
Method: GET
Purpose: Display password reset form from email link
=======================================================================================================================================
*/
router.get('/', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invalid Link - LMS Local</title>
            <style>
              body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; text-align: center; }
              .error { color: #dc2626; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>LMS Local</h1>
              <h2 class="error">Invalid Reset Link</h2>
              <p>The password reset link is invalid or missing the token.</p>
              <a href="http://localhost:3000/forgot-password" class="button">Request New Link</a>
            </div>
          </body>
        </html>
      `);
    }

    // Find user by token (only reset tokens)
    const result = await pool.query(
      'SELECT id, email, display_name, auth_token_expires FROM app_user WHERE auth_token = $1 AND auth_token LIKE $2',
      [token, 'reset_%']
    );

    if (result.rows.length === 0) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invalid Token - LMS Local</title>
            <style>
              body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; text-align: center; }
              .error { color: #dc2626; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>LMS Local</h1>
              <h2 class="error">Invalid or Expired Token</h2>
              <p>This password reset link is invalid or has already been used.</p>
              <p>Please request a new password reset link.</p>
              <a href="http://localhost:3000/forgot-password" class="button">Request New Link</a>
            </div>
          </body>
        </html>
      `);
    }

    const user = result.rows[0];

    // Check if token expired
    if (tokenUtils.isTokenExpired(user.auth_token_expires)) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Token Expired - LMS Local</title>
            <style>
              body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; text-align: center; }
              .error { color: #dc2626; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>LMS Local</h1>
              <h2 class="error">Reset Link Expired</h2>
              <p>This password reset link has expired for security reasons.</p>
              <p>Please request a new password reset link.</p>
              <a href="http://localhost:3000/forgot-password" class="button">Request New Link</a>
            </div>
          </body>
        </html>
      `);
    }

    // Show password reset form
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password - LMS Local</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
              margin: 0; 
              padding: 20px; 
              min-height: 100vh;
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: white; 
              padding: 40px; 
              border-radius: 15px; 
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            h1 { color: #2563eb; text-align: center; margin-bottom: 10px; }
            h2 { color: #1f2937; text-align: center; margin-bottom: 20px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; font-weight: bold; color: #374151; }
            input[type="password"] { 
              width: 100%; 
              padding: 12px; 
              border: 2px solid #d1d5db; 
              border-radius: 8px; 
              font-size: 16px;
              box-sizing: border-box;
            }
            input[type="password"]:focus { 
              outline: none; 
              border-color: #2563eb; 
            }
            .button { 
              width: 100%;
              background: #2563eb; 
              color: white; 
              padding: 15px; 
              border: none;
              border-radius: 8px; 
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .button:hover { background: #1d4ed8; }
            .button:disabled { background: #9ca3af; cursor: not-allowed; }
            .error { color: #dc2626; background: #fef2f2; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
            .success { color: #059669; background: #f0fdf4; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
            .password-hint { font-size: 14px; color: #6b7280; margin-top: 5px; }
            .loading { display: none; }
            .back-link { text-align: center; margin-top: 20px; }
            .back-link a { color: #2563eb; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>LMS Local</h1>
            <h2>Reset Your Password</h2>
            
            <div id="message"></div>
            
            <form id="resetForm" method="post" action="javascript:void(0)">
              <input type="hidden" name="token" value="${token}">
              
              <div class="form-group">
                <label for="password">New Password</label>
                <input type="password" id="password" name="password" required minlength="8" placeholder="Enter new password">
                <div class="password-hint">Password must be at least 8 characters long</div>
              </div>
              
              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required minlength="8" placeholder="Confirm new password">
              </div>
              
              <button type="submit" class="button" id="submitBtn">
                <span id="buttonText">Reset Password</span>
                <span id="loadingText" class="loading">Resetting...</span>
              </button>
            </form>
            
            <div class="back-link">
              <a href="http://localhost:3000/login">Back to Login</a>
            </div>
          </div>

          <script>
            document.getElementById('resetForm').addEventListener('submit', async function(e) {
              e.preventDefault();
              
              const messageDiv = document.getElementById('message');
              const password = document.getElementById('password').value;
              const confirmPassword = document.getElementById('confirmPassword').value;
              const token = document.querySelector('input[name="token"]').value;
              const submitBtn = document.getElementById('submitBtn');
              const buttonText = document.getElementById('buttonText');
              const loadingText = document.getElementById('loadingText');
              
              // Clear previous messages
              messageDiv.innerHTML = '';
              
              // Validation
              if (!password || !confirmPassword) {
                messageDiv.innerHTML = '<div class="error">Please fill in both password fields</div>';
                return;
              }
              
              if (password.length < 8) {
                messageDiv.innerHTML = '<div class="error">Password must be at least 8 characters long</div>';
                return;
              }
              
              if (password !== confirmPassword) {
                messageDiv.innerHTML = '<div class="error">Passwords do not match</div>';
                return;
              }
              
              // Show loading state
              submitBtn.disabled = true;
              buttonText.style.display = 'none';
              loadingText.style.display = 'inline';
              
              try {
                const response = await fetch('/reset-password', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    token: token,
                    new_password: password
                  })
                });
                
                const data = await response.json();
                
                if (data.return_code === 'SUCCESS') {
                  messageDiv.innerHTML = '<div class="success">Password reset successfully! You can now login with your new password.<br><br><a href="http://localhost:3000/login" class="button" style="display: inline-block; text-decoration: none; margin-top: 10px;">Go to Login</a></div>';
                  // Hide the form
                  document.getElementById('resetForm').style.display = 'none';
                } else {
                  messageDiv.innerHTML = '<div class="error">' + (data.message || 'Failed to reset password') + '</div>';
                  // Reset button state
                  submitBtn.disabled = false;
                  buttonText.style.display = 'inline';
                  loadingText.style.display = 'none';
                }
              } catch (error) {
                messageDiv.innerHTML = '<div class="error">Network error. Please try again.</div>';
                // Reset button state
                submitBtn.disabled = false;
                buttonText.style.display = 'inline';
                loadingText.style.display = 'none';
              }
            });
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Password reset form error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - LMS Local</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; text-align: center; }
            .error { color: #dc2626; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>LMS Local</h1>
            <h2 class="error">Reset Error</h2>
            <p>An error occurred while loading the password reset form. Please try again or contact support.</p>
            <a href="http://localhost:3000/forgot-password" class="button">Request New Link</a>
          </div>
        </body>
      </html>
    `);
  }
});

/*
=======================================================================================================================================
API Route: /reset-password (POST)
=======================================================================================================================================
Method: POST
Purpose: Process password reset from form
=======================================================================================================================================
*/
router.post('/', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    // Validation
    if (!token || !new_password) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Token and new password are required"
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Password must be at least 8 characters long"
      });
    }

    // Find user by token (only reset tokens)
    const result = await pool.query(
      'SELECT id, auth_token_expires FROM app_user WHERE auth_token = $1 AND auth_token LIKE $2',
      [token, 'reset_%']
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        return_code: "INVALID_TOKEN",
        message: "Invalid or expired reset token"
      });
    }

    const user = result.rows[0];

    // Check if token expired
    if (tokenUtils.isTokenExpired(user.auth_token_expires)) {
      return res.status(400).json({
        return_code: "TOKEN_EXPIRED",
        message: "Reset token has expired. Please request a new one."
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password and clear token
    await pool.query(
      'UPDATE app_user SET password_hash = $1, auth_token = NULL, auth_token_expires = NULL, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({
      return_code: "SUCCESS",
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;