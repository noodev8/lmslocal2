/*
=======================================================================================================================================
Set Pick Route
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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
API Route: /set-pick
=======================================================================================================================================
Method: POST
Purpose: Make or update a pick for a round (player picks own team, admin can pick for any player)
=======================================================================================================================================
Request Payload (Player):
{
  "fixture_id": 24,
  "team": "home"
}

Request Payload (Admin setting for another player):
{
  "fixture_id": 24,
  "team": "away",
  "user_id": 12
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Pick saved successfully",
  "pick": {
    "id": 1,
    "team": "CHE",
    "fixture_id": 24,
    "created_at": "2025-08-25T21:00:00Z"
  }
}
=======================================================================================================================================
*/
router.post('/', verifyPlayerToken, async (req, res) => {
  try {
    const { fixture_id, team, user_id } = req.body;
    const authenticated_user_id = req.user.id;
    const target_user_id = user_id || authenticated_user_id; // Default to own pick if no user_id provided

    // Basic validation
    if (!fixture_id || !Number.isInteger(fixture_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Fixture ID is required and must be a number"
      });
    }

    if (!team || !['home', 'away'].includes(team)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Team must be 'home' or 'away'"
      });
    }

    // Get fixture details and related competition/round info
    const fixtureCheck = await query(`
      SELECT f.id, f.home_team, f.away_team, f.home_team_short, f.away_team_short, f.round_id,
             r.competition_id, r.lock_time, r.round_number,
             c.organiser_id, c.name as competition_name
      FROM fixture f
      JOIN round r ON f.round_id = r.id
      JOIN competition c ON r.competition_id = c.id
      WHERE f.id = $1
    `, [fixture_id]);

    if (fixtureCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "FIXTURE_NOT_FOUND",
        message: "Fixture not found"
      });
    }

    const fixtureInfo = fixtureCheck.rows[0];
    const competition_id = fixtureInfo.competition_id;
    const round_id = fixtureInfo.round_id;

    // Check if user is admin (organiser) of this competition
    const isAdmin = fixtureInfo.organiser_id === authenticated_user_id;
    const isOwnPick = target_user_id === authenticated_user_id;

    // Players can only set their own picks, admins can set any pick
    if (!isAdmin && !isOwnPick) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "You can only set your own pick unless you are the competition organiser"
      });
    }

    // For player picks, verify this fixture is in their competition
    if (!isAdmin && competition_id !== req.competition_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "This fixture is not in your competition"
      });
    }

    // Convert home/away to team short code
    const teamShortCode = team === 'home' ? fixtureInfo.home_team_short : fixtureInfo.away_team_short;

    // Verify target user is part of this competition
    const memberCheck = await query(`
      SELECT cu.status
      FROM competition_user cu
      WHERE cu.competition_id = $1 AND cu.user_id = $2
    `, [competition_id, target_user_id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Target user is not part of this competition"
      });
    }

    // Check if round is locked (admins can override)
    if (!isAdmin) {
      const now = new Date();
      const lockTime = new Date(fixtureInfo.lock_time);
      if (now >= lockTime) {
        return res.status(400).json({
          return_code: "ROUND_LOCKED",
          message: "This round is locked and picks cannot be changed"
        });
      }
    }

    // Check if team was already picked in previous rounds (no team twice rule)
    const previousPickCheck = await query(`
      SELECT p.team
      FROM pick p
      JOIN round r ON p.round_id = r.id
      WHERE r.competition_id = $1 AND p.user_id = $2 AND p.team = $3
    `, [competition_id, target_user_id, teamShortCode]);

    if (previousPickCheck.rows.length > 0) {
      return res.status(400).json({
        return_code: "TEAM_ALREADY_PICKED",
        message: "You have already picked this team in a previous round"
      });
    }

    // Insert or update the pick
    const result = await query(`
      INSERT INTO pick (round_id, user_id, team, fixture_id, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (round_id, user_id)
      DO UPDATE SET team = $3, fixture_id = $4, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [round_id, target_user_id, teamShortCode, fixture_id]);

    const pick = result.rows[0];

    // Log the pick
    const logDetails = isAdmin && !isOwnPick 
      ? `Admin set pick: ${teamShortCode} for User ${target_user_id} in Round ${fixtureInfo.round_number}`
      : `Player picked ${teamShortCode} for Round ${fixtureInfo.round_number}`;
      
    await query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Pick Made', $3)
    `, [
      competition_id,
      authenticated_user_id,
      logDetails
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Pick saved successfully",
      pick: {
        id: pick.id,
        team: pick.team,
        fixture_id: pick.fixture_id,
        created_at: pick.created_at
      }
    });

  } catch (error) {
    console.error('Set pick error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;