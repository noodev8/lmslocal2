/*
=======================================================================================================================================
Token Utilities
=======================================================================================================================================
Purpose: Generate and validate secure tokens for email verification and password reset
=======================================================================================================================================
*/

const crypto = require('crypto');

/**
 * Generate a secure random token with prefix
 * @param {string} prefix - Token prefix (e.g., 'verify_', 'reset_')
 * @returns {string} - Generated token
 */
const generateToken = (prefix = '') => {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return prefix + randomBytes;
};

/**
 * Check if a token has expired
 * @param {Date} expiryDate - Token expiry date
 * @returns {boolean} - True if expired
 */
const isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

/**
 * Get token expiry timestamp
 * @param {number} hours - Hours from now
 * @returns {Date} - Expiry timestamp
 */
const getTokenExpiry = (hours = 24) => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
};

module.exports = {
  generateToken,
  isTokenExpired,
  getTokenExpiry
};