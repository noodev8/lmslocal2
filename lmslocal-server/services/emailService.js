/*
=======================================================================================================================================
Email Service - Resend Integration
=======================================================================================================================================
Purpose: Handle email sending for verification and password reset using Resend API
=======================================================================================================================================
*/

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email verification link
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 * @param {string} displayName - User's display name
 */
const sendVerificationEmail = async (email, token, displayName) => {
  try {
    const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL}/auth/verify-email?token=${token}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - LMS Local</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">LMS Local</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Last Man Standing Competitions</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 30px; border-radius: 10px; text-align: center;">
              <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
              <p style="color: #4b5563; margin-bottom: 25px;">Hi ${displayName},</p>
              <p style="color: #4b5563; margin-bottom: 25px;">
                Welcome to LMS Local! Please click the button below to verify your email address and activate your account.
              </p>
              
              <a href="${verificationUrl}" 
                 style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                Verify Email Address
              </a>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
                This verification link will expire in 24 hours.
              </p>
              
              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                If you didn't create an account with LMS Local, you can safely ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>LMS Local - Admin-first Last Man Standing competitions</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      LMS Local - Verify Your Email Address
      
      Hi ${displayName},
      
      Welcome to LMS Local! Please visit the following link to verify your email address:
      
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with LMS Local, you can safely ignore this email.
      
      ---
      LMS Local - Admin-first Last Man Standing competitions
    `;

    const result = await resend.emails.send({
      from: `${process.env.EMAIL_NAME} <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: 'Verify your email address - LMS Local',
      html: htmlContent,
      text: textContent,
    });

    console.log('Verification email sent successfully:', result.id);
    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} token - Reset token
 * @param {string} displayName - User's display name
 */
const sendPasswordResetEmail = async (email, token, displayName) => {
  try {
    const resetUrl = `${process.env.EMAIL_VERIFICATION_URL}/auth/reset-password?token=${token}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - LMS Local</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">LMS Local</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Last Man Standing Competitions</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border-radius: 10px; text-align: center;">
              <h2 style="color: #92400e; margin-top: 0;">Reset Your Password</h2>
              <p style="color: #78350f; margin-bottom: 25px;">Hi ${displayName},</p>
              <p style="color: #78350f; margin-bottom: 25px;">
                You requested a password reset for your LMS Local account. Click the button below to create a new password.
              </p>
              
              <a href="${resetUrl}" 
                 style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                Reset Password
              </a>
              
              <p style="color: #a16207; font-size: 14px; margin-top: 25px;">
                This reset link will expire in 1 hour for security.
              </p>
              
              <p style="color: #a16207; font-size: 12px; margin-top: 20px;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
              <p>LMS Local - Admin-first Last Man Standing competitions</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
      LMS Local - Reset Your Password
      
      Hi ${displayName},
      
      You requested a password reset for your LMS Local account. Please visit the following link to create a new password:
      
      ${resetUrl}
      
      This reset link will expire in 1 hour for security.
      
      If you didn't request a password reset, you can safely ignore this email.
      
      ---
      LMS Local - Admin-first Last Man Standing competitions
    `;

    const result = await resend.emails.send({
      from: `${process.env.EMAIL_NAME} <${process.env.EMAIL_FROM}>`,
      to: [email],
      subject: 'Reset your password - LMS Local',
      html: htmlContent,
      text: textContent,
    });

    console.log('Password reset email sent successfully:', result.id);
    return { success: true, messageId: result.id };

  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};