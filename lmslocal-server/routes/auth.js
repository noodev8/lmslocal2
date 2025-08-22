/*
=======================================================================================================================================
API Route: auth
=======================================================================================================================================
Method: POST
Purpose: Authentication endpoints for login, register, and profile management
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const emailService = require('../services/emailService');
const tokenUtils = require('../utils/tokenUtils');

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
    const result = await db.query('SELECT id, email, display_name, email_verified FROM app_user WHERE id = $1', [decoded.userId]);
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
API Route: auth/register
=======================================================================================================================================
Method: POST
Purpose: Register a new user account
=======================================================================================================================================
Request Payload:
{
  "display_name": "John Doe",              // string, required
  "email": "user@example.com",             // string, required
  "password": "password123"                // string, required (min 8 chars)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Registration successful. Please check your email to verify your account.",
  "user_id": 123
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"EMAIL_EXISTS"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/register', async (req, res) => {
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
    const existingUser = await db.query('SELECT id FROM app_user WHERE email = $1', [email.toLowerCase()]);
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
    const result = await db.query(
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

/*
=======================================================================================================================================
API Route: auth/login
=======================================================================================================================================
Method: POST
Purpose: Authenticate user and return JWT token
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com",             // string, required
  "password": "password123"                // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "display_name": "John Doe",
    "email_verified": true
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"INVALID_CREDENTIALS"
"EMAIL_NOT_VERIFIED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Email and password are required"
      });
    }

    // Get user from database
    const result = await db.query(
      'SELECT id, email, display_name, password_hash, email_verified FROM app_user WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        return_code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        return_code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      });
    }

    // Check email verification (optional - can be enabled later)
    // if (!user.email_verified) {
    //   return res.status(401).json({
    //     return_code: "EMAIL_NOT_VERIFIED",
    //     message: "Please verify your email address before logging in"
    //   });
    // }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last active
    await db.query('UPDATE app_user SET last_active_at = NOW() WHERE id = $1', [user.id]);

    res.json({
      return_code: "SUCCESS",
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        email_verified: user.email_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: auth/update-profile
=======================================================================================================================================
Method: POST
Purpose: Update user profile information
=======================================================================================================================================
Request Payload:
{
  "display_name": "New Name"               // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Profile updated successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/update-profile', verifyToken, async (req, res) => {
  try {
    const { display_name } = req.body;

    // Validation
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Display name is required"
      });
    }

    if (display_name.trim().length < 2) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Display name must be at least 2 characters long"
      });
    }

    // Update user profile
    await db.query(
      'UPDATE app_user SET display_name = $1, updated_at = NOW() WHERE id = $2',
      [display_name.trim(), req.user.id]
    );

    res.json({
      return_code: "SUCCESS",
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: auth/resend-verification
=======================================================================================================================================
Method: POST
Purpose: Resend email verification link
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com"                 // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Verification email sent successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"USER_NOT_FOUND"
"ALREADY_VERIFIED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/resend-verification', async (req, res) => {
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
    const result = await db.query(
      'SELECT id, display_name, email_verified FROM app_user WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({
        return_code: "SUCCESS",
        message: "If an account with this email exists, a verification email has been sent"
      });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({
        return_code: "ALREADY_VERIFIED",
        message: "Email is already verified"
      });
    }

    // Generate new verification token
    const verificationToken = tokenUtils.generateToken('verify_');
    const tokenExpiry = tokenUtils.getTokenExpiry(24); // 24 hours

    // Update user with new token
    await db.query(
      'UPDATE app_user SET auth_token = $1, auth_token_expires = $2, updated_at = NOW() WHERE id = $3',
      [verificationToken, tokenExpiry, user.id]
    );

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(email.toLowerCase(), verificationToken, user.display_name);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return res.status(500).json({
        return_code: "EMAIL_SEND_FAILED",
        message: "Failed to send verification email. Please try again later."
      });
    }

    res.json({
      return_code: "SUCCESS",
      message: "Verification email sent successfully"
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: auth/forgot-password
=======================================================================================================================================
Method: POST
Purpose: Send password reset email
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com"                 // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "If an account with this email exists, a password reset link has been sent"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/forgot-password', async (req, res) => {
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
    const result = await db.query(
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
    await db.query(
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

/*
=======================================================================================================================================
API Route: auth/verify-email
=======================================================================================================================================
Method: GET
Purpose: Verify user email address via token from email link
=======================================================================================================================================
Request: GET /auth/verify-email?token=verify_xxxxx

Success Response: HTML page with success message
Error Response: HTML page with error message
=======================================================================================================================================
Return Codes: N/A (HTML responses)
=======================================================================================================================================
*/
router.get('/verify-email', async (req, res) => {
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
              <h2 class="error">Invalid Verification Link</h2>
              <p>The verification link is invalid or missing the token.</p>
              <a href="http://localhost:3000/login" class="button">Back to Login</a>
            </div>
          </body>
        </html>
      `);
    }

    // Find user by token
    const result = await db.query(
      'SELECT id, email, display_name, auth_token_expires, email_verified FROM app_user WHERE auth_token = $1',
      [token]
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
              <p>This verification link is invalid or has already been used.</p>
              <p>Please request a new verification email or contact support.</p>
              <a href="http://localhost:3000/login" class="button">Back to Login</a>
            </div>
          </body>
        </html>
      `);
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Already Verified - LMS Local</title>
            <style>
              body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; text-align: center; }
              .success { color: #059669; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>LMS Local</h1>
              <h2 class="success">Email Already Verified</h2>
              <p>Your email address has already been verified.</p>
              <p>You can now log in to your account.</p>
              <a href="http://localhost:3000/login" class="button">Continue to Login</a>
            </div>
          </body>
        </html>
      `);
    }

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
              <h2 class="error">Verification Link Expired</h2>
              <p>This verification link has expired.</p>
              <p>Please request a new verification email.</p>
              <a href="http://localhost:3000/register" class="button">Request New Link</a>
            </div>
          </body>
        </html>
      `);
    }

    // Verify the email
    await db.query(
      'UPDATE app_user SET email_verified = true, auth_token = NULL, auth_token_expires = NULL, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verified - LMS Local</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
              margin: 0; 
              padding: 20px; 
              min-height: 100vh;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white; 
              padding: 40px; 
              border-radius: 15px; 
              text-align: center; 
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            .success { color: #059669; }
            .checkmark {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              background: #059669;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .checkmark::after {
              content: '✓';
              color: white;
              font-size: 30px;
              font-weight: bold;
            }
            .button { 
              display: inline-block; 
              background: #2563eb; 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 8px; 
              margin-top: 25px; 
              font-weight: bold;
              transition: background-color 0.2s;
            }
            .button:hover { background: #1d4ed8; }
            h1 { color: #2563eb; margin-bottom: 10px; }
            h2 { color: #1f2937; margin-bottom: 15px; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>LMS Local</h1>
            <div class="checkmark"></div>
            <h2>Email Verified Successfully!</h2>
            <p>Welcome <strong>${user.display_name}</strong>!</p>
            <p>Your email address has been verified. You can now log in to your LMS Local account and start creating Last Man Standing competitions.</p>
            <a href="http://localhost:3000/login" class="button">Continue to Login</a>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Email verification error:', error);
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
            <h2 class="error">Verification Error</h2>
            <p>An error occurred while verifying your email. Please try again or contact support.</p>
            <a href="http://localhost:3000/login" class="button">Back to Login</a>
          </div>
        </body>
      </html>
    `);
  }
});

/*
=======================================================================================================================================
API Route: auth/reset-password (GET)
=======================================================================================================================================
Method: GET
Purpose: Display password reset form from email link
=======================================================================================================================================
Request: GET /auth/reset-password?token=reset_xxxxx

Success Response: HTML page with password reset form
Error Response: HTML page with error message
=======================================================================================================================================
Return Codes: N/A (HTML responses)
=======================================================================================================================================
*/
router.get('/reset-password', async (req, res) => {
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
    const result = await db.query(
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
                const response = await fetch('/auth/reset-password', {
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
API Route: auth/reset-password (POST)
=======================================================================================================================================
Method: POST
Purpose: Process password reset from form
=======================================================================================================================================
Request Payload:
{
  "token": "reset_xxxxx",                      // string, required
  "new_password": "newpassword123"             // string, required (min 8 chars)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Password reset successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"INVALID_TOKEN"
"TOKEN_EXPIRED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/reset-password', async (req, res) => {
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
    const result = await db.query(
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
    await db.query(
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