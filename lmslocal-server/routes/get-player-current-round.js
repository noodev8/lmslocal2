/*
=======================================================================================================================================
Get Player Current Round Route - Get current round info for player
=======================================================================================================================================
*/

const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../database');
const router = express.Router();

// Middleware to verify player JWT token
const verifyPlayerToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        return_code: "UNAUTHORIZED",
        message: "No token provided"
      });
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      throw jwtError;
    }
    
    // Get user from database
    const result = await query('SELECT id, email, display_name FROM app_user WHERE id = $1', [decoded.user_id]);
    if (result.rows.length === 0) {
      return res.status(401).json({
        return_code: "UNAUTHORIZED",
        message: "Invalid token"
      });
    }

    req.user = result.rows[0];
    req.competition_id = decoded.competition_id;
    req.slug = decoded.slug;
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
API Route: /get-player-current-round
=======================================================================================================================================
Method: POST
Purpose: Get current round information and fixtures for player
=======================================================================================================================================
Request Payload:
{
  "slug": "10001"
}

Success Response:
{
  "return_code": "SUCCESS",
  "current_round": {
    "id": 1,
    "round_number": 1,
    "lock_time": "2025-08-26T14:00:00Z",
    "is_locked": false,
    "fixtures": [
      {
        "id": 16,
        "home_team": "Arsenal",
        "away_team": "Aston Villa", 
        "home_team_short": "ARS",
        "away_team_short": "AVL",
        "kickoff_time": "2025-08-26T15:00:00Z"
      }
    ]
  },
  "player_pick": {
    "team": "ARS",
    "fixture_id": 16,
    "created_at": "2025-08-25T10:00:00Z"
  },
  "competition": {
    "id": 123,
    "name": "Premier League Survivor",
    "status": "UNLOCKED"
  }
}
=======================================================================================================================================
*/
router.post('/', verifyPlayerToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const competition_id = req.competition_id;
    

    // Get competition info using ID from JWT
    const competitionResult = await query(`
      SELECT id, name, status, slug
      FROM competition
      WHERE id = $1
    `, [competition_id]);

    if (competitionResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "COMPETITION_NOT_FOUND",
        message: "Competition not found"
      });
    }

    const competition = competitionResult.rows[0];

    // Verify user is in this competition (should be guaranteed by JWT, but double-check)
    const memberCheck = await query(`
      SELECT status, lives_remaining
      FROM competition_user
      WHERE competition_id = $1 AND user_id = $2
    `, [competition_id, user_id]);

    if (memberCheck.rows.length === 0) {
      console.error('User not found in competition_user table:', { competition_id, user_id });
      return res.status(403).json({
        return_code: "NOT_MEMBER",
        message: "You are not a member of this competition"
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
      return res.json({
        return_code: "SUCCESS",
        current_round: null,
        player_pick: null,
        competition: {
          id: competition_id,
          name: competition.name,
          status: competition.status
        },
        message: "No rounds created yet"
      });
    }

    const currentRound = roundResult.rows[0];
    const now = new Date();
    const lockTime = new Date(currentRound.lock_time);
    const isLocked = now >= lockTime;

    // Get fixtures for current round
    const fixturesResult = await query(`
      SELECT id, home_team, away_team, home_team_short, away_team_short, kickoff_time
      FROM fixture
      WHERE round_id = $1
      ORDER BY kickoff_time ASC
    `, [currentRound.id]);

    // Get player's pick for this round
    const pickResult = await query(`
      SELECT team, fixture_id, created_at
      FROM pick
      WHERE round_id = $1 AND user_id = $2
    `, [currentRound.id, user_id]);

    const playerPick = pickResult.rows.length > 0 ? pickResult.rows[0] : null;

    res.json({
      return_code: "SUCCESS",
      current_round: {
        id: currentRound.id,
        round_number: currentRound.round_number,
        lock_time: currentRound.lock_time,
        is_locked: isLocked,
        fixtures: fixturesResult.rows
      },
      player_pick: playerPick,
      competition: {
        id: competition_id,
        name: competition.name,
        status: competition.status
      }
    });

  } catch (error) {
    console.error('Get player current round error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;