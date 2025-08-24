/*
=======================================================================================================================================
Create Competition Route - Create new competition
=======================================================================================================================================
Purpose: Create new competition for authenticated user
=======================================================================================================================================
*/

const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

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
    const result = await pool.query('SELECT id, email, display_name, email_verified FROM app_user WHERE id = $1', [decoded.userId]);
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
API Route: /create-competition
=======================================================================================================================================
Method: POST
Purpose: Create a new competition
=======================================================================================================================================
Request Payload:
{
  "name": "Premier League LMS 2025",
  "description": "Our annual football competition",
  "team_list_id": 1,
  "lives_per_player": 1,
  "no_team_twice": true,
  "organiser_joins_as_player": true
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Competition created successfully",
  "competition": {
    "id": 123,
    "name": "Premier League LMS 2025",
    "description": "Our annual football competition",
    "status": "UNLOCKED",
    "team_list_id": 1,
    "lives_per_player": 1,
    "no_team_twice": true,
    "invite_code": "1.4567",
    "created_at": "2025-01-01T12:00:00.000Z",
    "organiser_id": 456
  }
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description, team_list_id, lives_per_player, no_team_twice, organiser_joins_as_player } = req.body;

    // Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Competition name is required"
      });
    }

    if (!team_list_id || !Number.isInteger(team_list_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Team list ID is required and must be a number"
      });
    }

    const organiser_id = req.user.id;

    // Validate team_list exists and is accessible
    const teamListCheck = await pool.query(
      'SELECT id, name FROM team_list WHERE id = $1 AND is_active = true',
      [team_list_id]
    );

    if (teamListCheck.rows.length === 0) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Invalid team list selected"
      });
    }

    // Generate unique invite code in format: <organiser_id>.<4digit_pin>
    const generateInviteCode = async (organiserId) => {
      let isUnique = false;
      let inviteCode = '';
      let attempts = 0;
      const maxAttempts = 100;

      while (!isUnique && attempts < maxAttempts) {
        // Generate 4-digit random number
        const pin = Math.floor(1000 + Math.random() * 9000);
        inviteCode = `${organiserId}.${pin}`;

        // Check if this code already exists for this organiser
        const existingCode = await pool.query(
          'SELECT id FROM competition WHERE organiser_id = $1 AND invite_code = $2',
          [organiserId, inviteCode]
        );

        if (existingCode.rows.length === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Unable to generate unique invite code after multiple attempts');
      }

      return inviteCode;
    };

    // Generate the invite code
    const inviteCode = await generateInviteCode(organiser_id);

    // Create the competition with invite code
    const result = await pool.query(`
      INSERT INTO competition (
        name, 
        description, 
        team_list_id, 
        status, 
        lives_per_player, 
        no_team_twice, 
        organiser_id,
        invite_code,
        created_at
      )
      VALUES ($1, $2, $3, 'UNLOCKED', $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      name.trim(),
      description ? description.trim() : null,
      team_list_id,
      lives_per_player || 1,
      no_team_twice !== false, // Default to true
      organiser_id,
      inviteCode
    ]);

    const competition = result.rows[0];

    // If organiser wants to join as a player, add them to competition_user table
    if (organiser_joins_as_player === true) {
      await pool.query(`
        INSERT INTO competition_user (
          competition_id,
          user_id,
          status,
          lives_remaining,
          joined_at
        )
        VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP)
      `, [
        competition.id,
        organiser_id,
        competition.lives_per_player
      ]);
    }

    // Log the creation
    const participationStatus = organiser_joins_as_player ? 'as organiser and player' : 'as organiser only';
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Competition Created', $3)
    `, [
      competition.id,
      organiser_id,
      `Created competition "${competition.name}" with ${competition.lives_per_player} lives per player, joined ${participationStatus}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Competition created successfully",
      competition: {
        id: competition.id,
        name: competition.name,
        description: competition.description,
        status: competition.status,
        team_list_id: competition.team_list_id,
        lives_per_player: competition.lives_per_player,
        no_team_twice: competition.no_team_twice,
        invite_code: competition.invite_code,
        created_at: competition.created_at,
        organiser_id: competition.organiser_id
      }
    });

  } catch (error) {
    console.error('Create competition error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;