/*
=======================================================================================================================================
Player Dashboard Route - Get competitions where user is a participant
=======================================================================================================================================
Purpose: Return competitions where the authenticated user is participating (not organizing)
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
API Route: /player-dashboard
=======================================================================================================================================
Method: POST
Purpose: Get all competitions where the user is a participant (not organizer)
=======================================================================================================================================
Request Payload:
{}

Success Response:
{
  "return_code": "SUCCESS",
  "competitions": [
    {
      "id": 123,
      "name": "Premier League Last Man Standing",
      "player_count": 15,
      "current_round": 3,
      "total_rounds": 10,
      "needs_pick": true,
      "my_pick": "MAN",
      "is_organiser": false,
      "lives_remaining": 2,
      "user_status": "active"
    }
  ]
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

    // Get competitions where user is a participant (not organizer)
    const competitionsResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.organiser_id,
        c.created_at,
        (SELECT COUNT(*) FROM competition_user cu WHERE cu.competition_id = c.id) as player_count,
        (SELECT MAX(round_number) FROM round WHERE competition_id = c.id) as total_rounds,
        (
          SELECT r.round_number 
          FROM round r 
          WHERE r.competition_id = c.id 
          ORDER BY r.round_number DESC 
          LIMIT 1
        ) as current_round,
        cu.lives_remaining,
        cu.status as user_status,
        CASE WHEN c.organiser_id = $1 THEN true ELSE false END as is_organiser
      FROM competition c
      INNER JOIN competition_user cu ON c.id = cu.competition_id
      WHERE cu.user_id = $1 AND c.organiser_id != $1
      ORDER BY c.created_at DESC
    `, [user_id]);

    const competitions = competitionsResult.rows;

    // For each competition, check if user needs to make a pick
    for (let comp of competitions) {
      if (comp.current_round && comp.user_status === 'active') {
        // Get the round ID for current round
        const roundResult = await query(
          'SELECT id FROM round WHERE competition_id = $1 AND round_number = $2',
          [comp.id, comp.current_round]
        );
        
        if (roundResult.rows.length > 0) {
          const roundId = roundResult.rows[0].id;
          
          // Check if fixtures exist for this round
          const fixtureCountResult = await query(
            'SELECT COUNT(*) as count FROM fixture WHERE round_id = $1',
            [roundId]
          );
          const fixturesExist = parseInt(fixtureCountResult.rows[0].count) > 0;
          
          // Check if user has made a pick for this round
          const pickCountResult = await query(
            'SELECT COUNT(*) as count FROM pick WHERE user_id = $1 AND round_id = $2',
            [user_id, roundId]
          );
          const userHasPick = parseInt(pickCountResult.rows[0].count) > 0;
          
          // Set the needs_pick status
          comp.needs_pick = fixturesExist && !userHasPick;
        } else {
          comp.needs_pick = false;
        }
      } else {
        comp.needs_pick = false;
      }
    }

    res.json({
      return_code: "SUCCESS",
      competitions: competitions
    });

  } catch (error) {
    console.error('Player dashboard error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;