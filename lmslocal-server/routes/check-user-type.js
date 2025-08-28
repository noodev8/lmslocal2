/*
=======================================================================================================================================
Check User Type Route - Determine if user is primarily organizer or player
=======================================================================================================================================
Purpose: Analyze user's competitions to determine their primary role for smart routing
=======================================================================================================================================
*/

const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../database');
const router = express.Router();

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
    const userId = decoded.user_id || decoded.userId; // Handle both formats
    const result = await query('SELECT id, email, display_name, email_verified FROM app_user WHERE id = $1', [userId]);
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
API Route: /check-user-type
=======================================================================================================================================
Method: POST
Purpose: Determine user's primary role (organizer vs player) and suggest default dashboard
=======================================================================================================================================
Request Payload:
{}

Success Response:
{
  "return_code": "SUCCESS",
  "user_type": "organizer", // "organizer", "player", or "both"
  "suggested_route": "/dashboard", // "/dashboard" for organizers, "/play" for players
  "organized_count": 3,
  "participating_count": 1,
  "has_organized": true,
  "has_participated": true
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    // Count organized competitions
    const organizedResult = await query(
      'SELECT COUNT(*) as count FROM competition WHERE organiser_id = $1',
      [user_id]
    );
    const organized_count = parseInt(organizedResult.rows[0].count);

    // Count competitions where user is a participant (not organizer)
    const participatingResult = await query(
      'SELECT COUNT(*) as count FROM competition_user cu INNER JOIN competition c ON cu.competition_id = c.id WHERE cu.user_id = $1 AND c.organiser_id != $1',
      [user_id]
    );
    const participating_count = parseInt(participatingResult.rows[0].count);

    // Determine user type and suggested route
    const has_organized = organized_count > 0;
    const has_participated = participating_count > 0;

    let user_type;
    let suggested_route;

    if (has_organized && !has_participated) {
      user_type = "organizer";
      suggested_route = "/dashboard";
    } else if (!has_organized && has_participated) {
      user_type = "player";
      suggested_route = "/play";
    } else if (has_organized && has_participated) {
      // Both - prioritize organizer role if they have more organized than participating
      if (organized_count >= participating_count) {
        user_type = "both";
        suggested_route = "/dashboard";
      } else {
        user_type = "both";
        suggested_route = "/play";
      }
    } else {
      // Neither - new user, default to organizer (business focus)
      user_type = "new";
      suggested_route = "/dashboard";
    }

    res.json({
      return_code: "SUCCESS",
      user_type: user_type,
      suggested_route: suggested_route,
      organized_count: organized_count,
      participating_count: participating_count,
      has_organized: has_organized,
      has_participated: has_participated
    });

  } catch (error) {
    console.error('Check user type error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;