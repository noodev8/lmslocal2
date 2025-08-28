/*
=======================================================================================================================================
Get Competition Status Route
=======================================================================================================================================
Method: POST
Purpose: Get current round and fixture count to determine routing
=======================================================================================================================================
Request Payload:
{
  "competition_id": 123                   // number, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "current_round": {
    "id": 17,                            // number, current round ID
    "round_number": 2,                   // number, round number
    "lock_time": "2025-08-30T18:00:00Z"  // string, lock time
  },
  "fixture_count": 5,                    // number, fixtures in current round
  "should_route_to_results": true        // boolean, true if has fixtures
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR" 
"COMPETITION_NOT_FOUND"
"UNAUTHORIZED"
"SERVER_ERROR"
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

router.post('/', verifyToken, async (req, res) => {
  try {
    const { competition_id } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!competition_id || !Number.isInteger(competition_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Competition ID is required and must be a number"
      });
    }

    // Verify user is the organiser
    const competitionCheck = await query(
      'SELECT organiser_id, name FROM competition WHERE id = $1',
      [competition_id]
    );

    if (competitionCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "COMPETITION_NOT_FOUND",
        message: "Competition not found"
      });
    }

    if (competitionCheck.rows[0].organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can access this information"
      });
    }

    // Get current round (latest round)
    const roundResult = await query(`
      SELECT id, round_number, lock_time
      FROM round 
      WHERE competition_id = $1 
      ORDER BY round_number DESC 
      LIMIT 1
    `, [competition_id]);

    if (roundResult.rows.length === 0) {
      // No rounds exist
      return res.json({
        return_code: "SUCCESS",
        current_round: null,
        fixture_count: 0,
        should_route_to_results: false
      });
    }

    const currentRound = roundResult.rows[0];

    // Get fixture count for current round
    const fixtureCountResult = await query(`
      SELECT COUNT(*) as count
      FROM fixture
      WHERE round_id = $1
    `, [currentRound.id]);

    const fixtureCount = parseInt(fixtureCountResult.rows[0].count);

    res.json({
      return_code: "SUCCESS",
      current_round: {
        id: currentRound.id,
        round_number: currentRound.round_number,
        lock_time: currentRound.lock_time
      },
      fixture_count: fixtureCount,
      should_route_to_results: fixtureCount > 0
    });

  } catch (error) {
    console.error('Get competition status error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;