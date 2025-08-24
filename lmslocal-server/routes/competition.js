/*
=======================================================================================================================================
Competition Routes - API endpoints for managing competitions
=======================================================================================================================================
Purpose: Handle competition creation, retrieval, and management
=======================================================================================================================================
*/

const express = require('express');
const { Pool } = require('pg');
const { verifyToken } = require('./auth');
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
API Route: competitions/create
=======================================================================================================================================
Method: POST
Purpose: Create a new competition
=======================================================================================================================================
Request Payload:
{
  "name": "Premier League LMS 2025",          // string, required
  "description": "Our annual football competition", // string, optional
  "team_list_id": 1,                          // integer, required
  "lives_per_player": 1,                      // integer, optional (default: 1)
  "no_team_twice": true,                      // boolean, optional (default: true)
  "organiser_joins_as_player": true           // boolean, optional (default: true)
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Competition created successfully",
  "competition": {
    "id": 123,
    "name": "Premier League LMS 2025",
    "description": "Our annual football competition",
    "status": "draft",
    "team_list_id": 1,
    "lives_per_player": 1,
    "no_team_twice": true,
    "created_at": "2025-01-01T12:00:00.000Z",
    "organiser_id": 456
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"DATABASE_ERROR"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/create', verifyToken, async (req, res) => {
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

    // TODO: Add authentication middleware to get actual user ID
    // For now, we'll use a placeholder
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
      VALUES ($1, $2, $3, 'OPEN', $4, $5, $6, $7, CURRENT_TIMESTAMP)
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

/*
=======================================================================================================================================
API Route: competitions/team-lists
=======================================================================================================================================
Method: GET
Purpose: Get available team lists for competition creation
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "team_lists": [
    {
      "id": 1,
      "name": "Premier League 2025-26",
      "type": "epl",
      "season": "2025-26",
      "team_count": 20
    }
  ]
}
=======================================================================================================================================
*/
router.get('/team-lists', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        tl.id,
        tl.name,
        tl.type,
        tl.season,
        COUNT(t.id) as team_count
      FROM team_list tl
      LEFT JOIN team t ON t.team_list_id = tl.id AND t.is_active = true
      WHERE tl.is_active = true
      GROUP BY tl.id, tl.name, tl.type, tl.season
      ORDER BY 
        CASE tl.type 
          WHEN 'epl' THEN 1 
          ELSE 2 
        END,
        tl.created_at DESC
    `);

    res.json({
      return_code: "SUCCESS",
      team_lists: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        season: row.season,
        team_count: parseInt(row.team_count)
      }))
    });

  } catch (error) {
    console.error('Get team lists error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/my-competitions
=======================================================================================================================================
Method: GET
Purpose: Get competitions created by the authenticated user
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "competitions": [
    {
      "id": 123,
      "name": "Premier League LMS 2025",
      "status": "draft",
      "player_count": 0,
      "created_at": "2025-01-01T12:00:00.000Z"
    }
  ]
}
=======================================================================================================================================
*/
router.get('/my-competitions', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.status,
        c.lives_per_player,
        c.no_team_twice,
        c.invite_code,
        c.created_at,
        tl.name as team_list_name,
        COUNT(cu_all.user_id) as player_count,
        c.organiser_id
      FROM competition c
      JOIN team_list tl ON c.team_list_id = tl.id
      LEFT JOIN competition_user cu_all ON c.id = cu_all.competition_id
      LEFT JOIN competition_user cu_player ON c.id = cu_player.competition_id AND cu_player.user_id = $1
      WHERE (c.organiser_id = $1 OR cu_player.user_id = $1)
      GROUP BY c.id, c.name, c.description, c.status, c.lives_per_player, c.no_team_twice, c.invite_code, c.created_at, tl.name, c.organiser_id
      ORDER BY c.created_at DESC
    `, [user_id]);

    res.json({
      return_code: "SUCCESS",
      competitions: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        lives_per_player: row.lives_per_player,
        no_team_twice: row.no_team_twice,
        invite_code: row.invite_code,
        team_list_name: row.team_list_name,
        player_count: parseInt(row.player_count),
        created_at: row.created_at,
        is_organiser: row.organiser_id === user_id
      }))
    });

  } catch (error) {
    console.error('Get my competitions error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/join
=======================================================================================================================================
Method: POST
Purpose: Join a competition using an invite code
=======================================================================================================================================
Request Payload:
{
  "invite_code": "1.4567"                     // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Successfully joined competition",
  "competition": {
    "id": 123,
    "name": "Premier League LMS 2025",
    "status": "draft",
    "lives_per_player": 1,
    "invite_code": "1.4567"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"VALIDATION_ERROR"
"COMPETITION_NOT_FOUND"
"ALREADY_JOINED"
"COMPETITION_FULL"
"COMPETITION_STARTED"
"DATABASE_ERROR"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { invite_code } = req.body;

    // Basic validation
    if (!invite_code || !invite_code.trim()) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Invite code is required"
      });
    }

    const user_id = req.user.id;

    // Find the competition by invite code
    const competitionResult = await pool.query(
      'SELECT * FROM competition WHERE invite_code = $1',
      [invite_code.trim()]
    );

    if (competitionResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "COMPETITION_NOT_FOUND",
        message: "Invalid invite code. Please check the code and try again."
      });
    }

    const competition = competitionResult.rows[0];

    // Check if competition has started (only allow joining draft competitions for now)
    if (competition.status !== 'draft') {
      return res.status(400).json({
        return_code: "COMPETITION_STARTED",
        message: "This competition has already started and is no longer accepting new players."
      });
    }

    // Check if user is already in this competition
    const existingEntry = await pool.query(
      'SELECT id FROM competition_user WHERE competition_id = $1 AND user_id = $2',
      [competition.id, user_id]
    );

    if (existingEntry.rows.length > 0) {
      return res.status(400).json({
        return_code: "ALREADY_JOINED",
        message: "You have already joined this competition."
      });
    }


    // Add user to the competition
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
      user_id,
      competition.lives_per_player
    ]);

    // Log the join action
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Player Joined', $3)
    `, [
      competition.id,
      user_id,
      `Joined competition "${competition.name}" using invite code ${invite_code}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Successfully joined competition",
      competition: {
        id: competition.id,
        name: competition.name,
        description: competition.description,
        status: competition.status,
        lives_per_player: competition.lives_per_player,
        no_team_twice: competition.no_team_twice,
        invite_code: competition.invite_code
      }
    });

  } catch (error) {
    console.error('Join competition error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds
=======================================================================================================================================
Method: GET
Purpose: Get all rounds for a competition (organiser only)
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "rounds": [
    {
      "id": 1,
      "round_number": 1,
      "lock_time": "2025-08-25T14:00:00Z",
      "fixture_count": 10,
      "created_at": "2025-08-23T10:00:00Z"
    }
  ]
}
=======================================================================================================================================
*/
router.get('/:id/rounds', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const user_id = req.user.id;

    // Verify user is the organiser
    const competitionCheck = await pool.query(
      'SELECT organiser_id FROM competition WHERE id = $1',
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
        message: "Only the competition organiser can manage rounds"
      });
    }

    // Get rounds with fixture counts
    const result = await pool.query(`
      SELECT 
        r.id,
        r.round_number,
        r.lock_time,
        r.status,
        r.created_at,
        COUNT(f.id) as fixture_count
      FROM round r
      LEFT JOIN fixture f ON r.id = f.round_id
      WHERE r.competition_id = $1
      GROUP BY r.id, r.round_number, r.lock_time, r.status, r.created_at
      ORDER BY r.round_number ASC
    `, [competition_id]);

    res.json({
      return_code: "SUCCESS",
      rounds: result.rows.map(row => ({
        id: row.id,
        round_number: row.round_number,
        lock_time: row.lock_time,
        status: row.status,
        fixture_count: parseInt(row.fixture_count),
        created_at: row.created_at
      }))
    });

  } catch (error) {
    console.error('Get rounds error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds
=======================================================================================================================================
Method: POST
Purpose: Create a new round for a competition (organiser only)
=======================================================================================================================================
Request Payload:
{
  "lock_time": "2025-08-25T14:00:00Z"          // timestamp, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Round created successfully",
  "round": {
    "id": 1,
    "round_number": 1,
    "lock_time": "2025-08-25T14:00:00Z",
    "created_at": "2025-08-23T10:00:00Z"
  }
}
=======================================================================================================================================
*/
router.post('/:id/rounds', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const { lock_time } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!lock_time) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Lock time is required"
      });
    }

    // Verify user is the organiser
    const competitionCheck = await pool.query(
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
        message: "Only the competition organiser can create rounds"
      });
    }

    // Get the next round number
    const maxRoundResult = await pool.query(
      'SELECT COALESCE(MAX(round_number), 0) as max_round FROM round WHERE competition_id = $1',
      [competition_id]
    );
    const nextRoundNumber = maxRoundResult.rows[0].max_round + 1;

    // Create the round
    const result = await pool.query(`
      INSERT INTO round (
        competition_id,
        round_number,
        lock_time,
        status,
        created_at
      )
      VALUES ($1, $2, $3, 'CLOSED', CURRENT_TIMESTAMP)
      RETURNING *
    `, [competition_id, nextRoundNumber, lock_time]);

    const round = result.rows[0];

    // Log the creation
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Round Created', $3)
    `, [
      competition_id,
      user_id,
      `Created Round ${nextRoundNumber} for "${competitionCheck.rows[0].name}" with lock time ${lock_time}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Round created successfully",
      round: {
        id: round.id,
        round_number: round.round_number,
        lock_time: round.lock_time,
        created_at: round.created_at
      }
    });

  } catch (error) {
    console.error('Create round error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/fixtures
=======================================================================================================================================
Method: GET
Purpose: Get all fixtures for a specific round
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "fixtures": [
    {
      "id": 1,
      "home_team": {
        "id": 1,
        "name": "Arsenal",
        "short_name": "ARS"
      },
      "away_team": {
        "id": 2,
        "name": "Chelsea", 
        "short_name": "CHE"
      },
      "kickoff_time": "2025-08-25T15:00:00Z",
      "home_score": null,
      "away_score": null
    }
  ]
}
=======================================================================================================================================
*/
router.get('/:id/rounds/:roundId/fixtures', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const user_id = req.user.id;

    // Verify user is the organiser
    const competitionCheck = await pool.query(
      'SELECT organiser_id FROM competition WHERE id = $1',
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
        message: "Only the competition organiser can view fixtures"
      });
    }

    // Verify round belongs to competition
    const roundCheck = await pool.query(
      'SELECT id FROM round WHERE id = $1 AND competition_id = $2',
      [round_id, competition_id]
    );

    if (roundCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "ROUND_NOT_FOUND",
        message: "Round not found"
      });
    }

    // Get fixtures (current schema uses varchar team names)
    const result = await pool.query(`
      SELECT 
        f.id,
        f.home_team,
        f.away_team,
        f.home_team_short,
        f.away_team_short,
        f.kickoff_time,
        f.home_score,
        f.away_score,
        f.created_at
      FROM fixture f
      WHERE f.round_id = $1
      ORDER BY f.kickoff_time ASC
    `, [round_id]);

    res.json({
      return_code: "SUCCESS",
      fixtures: result.rows.map(row => ({
        id: row.id,
        home_team_name: row.home_team,
        away_team_name: row.away_team,
        home_team_short: row.home_team_short,
        away_team_short: row.away_team_short,
        kickoff_time: row.kickoff_time,
        home_score: row.home_score,
        away_score: row.away_score,
        created_at: row.created_at
      }))
    });

  } catch (error) {
    console.error('Get fixtures error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/fixtures
=======================================================================================================================================
Method: POST
Purpose: Add a fixture to a round (organiser only)
=======================================================================================================================================
Request Payload:
{
  "home_team": "Arsenal",
  "away_team": "Chelsea", 
  "home_team_short": "ARS",              // optional
  "away_team_short": "CHE",              // optional
  "kickoff_time": "2025-08-25T15:00:00Z"
}
=======================================================================================================================================
*/
router.post('/:id/rounds/:roundId/fixtures', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const { home_team_id, away_team_id, kickoff_time } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!home_team_id || !away_team_id || !kickoff_time) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Home team ID, away team ID, and kickoff time are required"
      });
    }

    // Validate team IDs are different
    if (home_team_id === away_team_id) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Home team and away team must be different"
      });
    }

    // Verify user is the organiser and round exists
    const verifyResult = await pool.query(`
      SELECT c.organiser_id, c.name as competition_name, r.round_number, r.status
      FROM competition c
      JOIN round r ON c.id = r.competition_id
      WHERE c.id = $1 AND r.id = $2
    `, [competition_id, round_id]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Competition or round not found"
      });
    }

    if (verifyResult.rows[0].organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can add fixtures"
      });
    }

    // Check if round is OPEN (cannot modify fixtures for open rounds)
    if (verifyResult.rows[0].status === 'OPEN') {
      return res.status(400).json({
        return_code: "ROUND_OPEN",
        message: "Cannot modify fixtures for an open round. Close the round first."
      });
    }

    // Verify team IDs exist and get team details
    const teamVerify = await pool.query(`
      SELECT t1.id as home_id, t1.name as home_name, t1.short_name as home_short,
             t2.id as away_id, t2.name as away_name, t2.short_name as away_short
      FROM team t1, team t2
      WHERE t1.id = $1 AND t2.id = $2 AND t1.is_active = true AND t2.is_active = true
    `, [home_team_id, away_team_id]);

    if (teamVerify.rows.length === 0) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "One or both team IDs are invalid"
      });
    }

    const teams = teamVerify.rows[0];

    // Check if fixture kickoff is before round lock time
    const roundLockCheck = await pool.query(`
      SELECT lock_time FROM round WHERE id = $1
    `, [round_id]);

    let warning = null;
    if (roundLockCheck.rows.length > 0) {
      const lockTime = new Date(roundLockCheck.rows[0].lock_time);
      const fixtureKickoff = new Date(kickoff_time);
      
      if (fixtureKickoff < lockTime) {
        const formattedKickoff = fixtureKickoff.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        const formattedLockTime = lockTime.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        warning = `Warning: Fixture kicks off at ${formattedKickoff} but round locks at ${formattedLockTime}.`;
      }
    }

    // Create the fixture (using current schema with varchar team names)
    const result = await pool.query(`
      INSERT INTO fixture (
        round_id,
        home_team,
        away_team,
        home_team_short,
        away_team_short,
        kickoff_time,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [round_id, teams.home_name, teams.away_name, teams.home_short, teams.away_short, kickoff_time]);

    const fixture = result.rows[0];

    // Log the creation
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Fixture Added', $3)
    `, [
      competition_id,
      user_id,
      `Added fixture ${teamVerify.rows[0].home_name} vs ${teamVerify.rows[0].away_name} to Round ${verifyResult.rows[0].round_number}`
    ]);

    const response = {
      return_code: "SUCCESS",
      message: "Fixture added successfully",
      fixture: fixture
    };

    if (warning) {
      response.warning = warning;
    }

    res.json(response);

  } catch (error) {
    console.error('Create fixture error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId
=======================================================================================================================================
Method: PUT
Purpose: Update a round (lock time)
=======================================================================================================================================
Request Body:
{
  "lock_time": "2025-08-25T14:00:00Z"
}
Success Response:
{
  "return_code": "SUCCESS",
  "message": "Round updated successfully",
  "round": {
    "id": 1,
    "round_number": 1,
    "lock_time": "2025-08-25T14:00:00Z"
  }
}
=======================================================================================================================================
*/
router.put('/:id/rounds/:roundId', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const { lock_time } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!lock_time) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Lock time is required"
      });
    }

    // Verify user is the organiser and round exists
    const verifyResult = await pool.query(`
      SELECT c.organiser_id, c.name as competition_name, r.round_number, r.lock_time as old_lock_time
      FROM competition c
      JOIN round r ON c.id = r.competition_id
      WHERE c.id = $1 AND r.id = $2
    `, [competition_id, round_id]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Competition or round not found"
      });
    }

    const round = verifyResult.rows[0];

    if (round.organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can edit rounds"
      });
    }

    // Check for fixtures that would be affected by lock time change
    const fixturesCheck = await pool.query(`
      SELECT COUNT(*) as fixture_count,
             MIN(kickoff_time) as earliest_kickoff
      FROM fixture
      WHERE round_id = $1 AND kickoff_time < $2
    `, [round_id, lock_time]);

    let warning = null;
    if (parseInt(fixturesCheck.rows[0].fixture_count) > 0) {
      const earliestKickoff = new Date(fixturesCheck.rows[0].earliest_kickoff);
      const newLockTime = new Date(lock_time);
      
      if (newLockTime > earliestKickoff) {
        const formattedKickoff = earliestKickoff.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        warning = `Warning: ${fixturesCheck.rows[0].fixture_count} fixture(s) kick off before the new lock time. The earliest fixture is at ${formattedKickoff}.`;
      }
    }

    // Update the round
    const result = await pool.query(`
      UPDATE round 
      SET lock_time = $1
      WHERE id = $2
      RETURNING *
    `, [lock_time, round_id]);

    const updatedRound = result.rows[0];

    // Log the update
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Round Updated', $3)
    `, [
      competition_id,
      user_id,
      `Updated Round ${round.round_number} lock time from ${new Date(round.old_lock_time).toISOString()} to ${lock_time}`
    ]);

    const response = {
      return_code: "SUCCESS",
      message: "Round updated successfully",
      round: {
        id: updatedRound.id,
        round_number: updatedRound.round_number,
        lock_time: updatedRound.lock_time,
        created_at: updatedRound.created_at
      }
    };

    if (warning) {
      response.warning = warning;
    }

    res.json(response);

  } catch (error) {
    console.error('Update round error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/fixtures/:fixtureId
=======================================================================================================================================
Method: DELETE
Purpose: Delete a specific fixture
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "message": "Fixture deleted successfully"
}
=======================================================================================================================================
*/
router.delete('/:id/rounds/:roundId/fixtures/:fixtureId', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const fixture_id = parseInt(req.params.fixtureId);
    const user_id = req.user.id;

    // Verify user is the organiser and get fixture details
    const verifyResult = await pool.query(`
      SELECT c.organiser_id, c.name as competition_name, r.round_number, r.status,
             f.home_team, f.away_team
      FROM competition c
      JOIN round r ON c.id = r.competition_id
      JOIN fixture f ON r.id = f.round_id
      WHERE c.id = $1 AND r.id = $2 AND f.id = $3
    `, [competition_id, round_id, fixture_id]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Competition, round, or fixture not found"
      });
    }

    const fixture = verifyResult.rows[0];

    if (fixture.organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can delete fixtures"
      });
    }

    // Check if round is OPEN (cannot modify fixtures for open rounds)
    if (fixture.status === 'OPEN') {
      return res.status(400).json({
        return_code: "ROUND_OPEN",
        message: "Cannot modify fixtures for an open round. Close the round first."
      });
    }

    // Delete the fixture
    await pool.query('DELETE FROM fixture WHERE id = $1', [fixture_id]);

    // Log the deletion
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Fixture Deleted', $3)
    `, [
      competition_id,
      user_id,
      `Deleted fixture ${fixture.home_team} vs ${fixture.away_team} from Round ${fixture.round_number}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Fixture deleted successfully"
    });

  } catch (error) {
    console.error('Delete fixture error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/teams
=======================================================================================================================================
Method: GET
Purpose: Get all teams for a competition
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "teams": [
    {
      "id": 1,
      "name": "Manchester United",
      "short_name": "MUN"
    }
  ]
}
=======================================================================================================================================
*/
router.get('/:id/teams', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const user_id = req.user.id;

    // Verify competition exists and user has access
    const competitionResult = await pool.query(`
      SELECT organiser_id, team_list_id
      FROM competition
      WHERE id = $1
    `, [competition_id]);

    if (competitionResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "NOT_FOUND",
        message: "Competition not found"
      });
    }

    const competition = competitionResult.rows[0];

    // Only organiser can view teams for fixture creation
    if (competition.organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can view teams"
      });
    }

    // Get teams from the competition's team list
    const result = await pool.query(`
      SELECT id, name, short_name
      FROM team
      WHERE team_list_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [competition.team_list_id]);

    res.json({
      return_code: "SUCCESS",
      teams: result.rows
    });

  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/active-rounds
=======================================================================================================================================
Method: GET
Purpose: Get active rounds for a competition where user can make picks
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "rounds": [
    {
      "id": 1,
      "round_number": 1,
      "lock_time": "2025-08-25T14:00:00Z",
      "status": "open",
      "has_pick": false
    }
  ]
}
=======================================================================================================================================
*/
router.get('/:id/active-rounds', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const user_id = req.user.id;

    // Verify user has access to the competition (either as player or organiser)
    const accessCheck = await pool.query(`
      SELECT 
        CASE 
          WHEN c.organiser_id = $2 THEN 'organiser'
          WHEN cu.user_id IS NOT NULL THEN 'player'
          ELSE NULL
        END as access_type,
        cu.status as player_status
      FROM competition c
      LEFT JOIN competition_user cu ON cu.competition_id = c.id AND cu.user_id = $2
      WHERE c.id = $1
    `, [competition_id, user_id]);
    
    if (accessCheck.rows.length === 0 || !accessCheck.rows[0].access_type) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "You are not part of this competition"
      });
    }

    // Get rounds where picks can be made (not locked yet)
    const roundsResult = await pool.query(`
      SELECT 
        r.id,
        r.round_number,
        r.lock_time,
        CASE WHEN p.id IS NOT NULL THEN true ELSE false END as has_pick
      FROM round r
      LEFT JOIN pick p ON r.id = p.round_id AND p.user_id = $2
      WHERE r.competition_id = $1 
        AND r.lock_time > CURRENT_TIMESTAMP
      ORDER BY r.round_number ASC
    `, [competition_id, user_id]);

    res.json({
      return_code: "SUCCESS",
      rounds: roundsResult.rows
    });

  } catch (error) {
    console.error('Get active rounds error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/pick
=======================================================================================================================================
Method: GET
Purpose: Get user's pick for a specific round and available fixtures
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "pick": {
    "id": 1,
    "team": "Arsenal",
    "fixture_id": 5,
    "locked_at": null
  },
  "fixtures": [...],
  "previous_picks": ["Manchester United", "Chelsea"],
  "round": {...}
}
=======================================================================================================================================
*/
router.get('/:id/rounds/:roundId/pick', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const user_id = req.user.id;

    // Verify user is part of the competition
    const memberCheck = await pool.query(`
      SELECT cu.status, c.name as competition_name, r.round_number, r.lock_time
      FROM competition_user cu
      JOIN competition c ON cu.competition_id = c.id
      JOIN round r ON c.id = r.competition_id
      WHERE cu.competition_id = $1 AND cu.user_id = $2 AND r.id = $3
    `, [competition_id, user_id, round_id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "You are not part of this competition or round not found"
      });
    }

    const roundInfo = memberCheck.rows[0];

    // Get user's current pick for this round
    const pickResult = await pool.query(`
      SELECT id, team, fixture_id, locked, created_at
      FROM pick
      WHERE round_id = $1 AND user_id = $2
    `, [round_id, user_id]);

    // Get all fixtures for this round
    const fixturesResult = await pool.query(`
      SELECT 
        f.id,
        f.home_team,
        f.away_team,
        f.home_team_short,
        f.away_team_short,
        f.kickoff_time,
        f.home_score,
        f.away_score
      FROM fixture f
      WHERE f.round_id = $1
      ORDER BY f.kickoff_time ASC
    `, [round_id]);

    // Get user's previous picks (teams they can't pick again)
    const previousPicksResult = await pool.query(`
      SELECT DISTINCT p.team
      FROM pick p
      JOIN round r ON p.round_id = r.id
      WHERE r.competition_id = $1 AND p.user_id = $2 AND p.team IS NOT NULL
    `, [competition_id, user_id]);

    res.json({
      return_code: "SUCCESS",
      pick: pickResult.rows.length > 0 ? pickResult.rows[0] : null,
      fixtures: fixturesResult.rows,
      previous_picks: previousPicksResult.rows.map(row => row.team),
      round: {
        id: round_id,
        round_number: roundInfo.round_number,
        lock_time: roundInfo.lock_time
      }
    });

  } catch (error) {
    console.error('Get pick error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/pick
=======================================================================================================================================
Method: POST
Purpose: Make or update a pick for a round
=======================================================================================================================================
Request Body:
{
  "team": "Arsenal",
  "fixture_id": 5
}
Success Response:
{
  "return_code": "SUCCESS",
  "message": "Pick saved successfully",
  "pick": {...}
}
=======================================================================================================================================
*/
router.post('/:id/rounds/:roundId/pick', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const { team, fixture_id } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!team || !fixture_id) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Team and fixture are required"
      });
    }

    // Verify user is part of the competition and round isn't locked
    const memberCheck = await pool.query(`
      SELECT cu.status, r.lock_time
      FROM competition_user cu
      JOIN competition c ON cu.competition_id = c.id
      JOIN round r ON c.id = r.competition_id
      WHERE cu.competition_id = $1 AND cu.user_id = $2 AND r.id = $3
    `, [competition_id, user_id, round_id]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "You are not part of this competition or round not found"
      });
    }

    const roundInfo = memberCheck.rows[0];

    // Check if round is locked
    const now = new Date();
    const lockTime = new Date(roundInfo.lock_time);
    if (now >= lockTime) {
      return res.status(400).json({
        return_code: "ROUND_LOCKED",
        message: "This round is locked and picks cannot be changed"
      });
    }

    // Check if existing pick is individually locked
    const existingPickCheck = await pool.query(`
      SELECT locked FROM pick
      WHERE round_id = $1 AND user_id = $2
    `, [round_id, user_id]);

    if (existingPickCheck.rows.length > 0 && existingPickCheck.rows[0].locked) {
      return res.status(400).json({
        return_code: "PICK_LOCKED",
        message: "Your pick is locked and cannot be changed"
      });
    }

    // Check if team was already picked in previous rounds
    const previousPickCheck = await pool.query(`
      SELECT p.team
      FROM pick p
      JOIN round r ON p.round_id = r.id
      WHERE r.competition_id = $1 AND p.user_id = $2 AND p.team = $3
    `, [competition_id, user_id, team]);

    if (previousPickCheck.rows.length > 0) {
      return res.status(400).json({
        return_code: "TEAM_ALREADY_PICKED",
        message: "You have already picked this team in a previous round"
      });
    }

    // Verify fixture exists and team is in the fixture
    const fixtureCheck = await pool.query(`
      SELECT home_team, away_team
      FROM fixture
      WHERE id = $1 AND round_id = $2
    `, [fixture_id, round_id]);

    if (fixtureCheck.rows.length === 0) {
      return res.status(400).json({
        return_code: "FIXTURE_NOT_FOUND",
        message: "Fixture not found"
      });
    }

    const fixture = fixtureCheck.rows[0];
    if (team !== fixture.home_team && team !== fixture.away_team) {
      return res.status(400).json({
        return_code: "INVALID_TEAM",
        message: "Selected team is not playing in this fixture"
      });
    }

    // Insert or update the pick
    const result = await pool.query(`
      INSERT INTO pick (round_id, user_id, team, fixture_id, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (round_id, user_id)
      DO UPDATE SET team = $3, fixture_id = $4, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [round_id, user_id, team, fixture_id]);

    const pick = result.rows[0];

    // Log the pick
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Pick Made', $3)
    `, [
      competition_id,
      user_id,
      `Picked ${team} for Round ${roundInfo.round_number || round_id}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Pick saved successfully",
      pick: pick
    });

  } catch (error) {
    console.error('Create pick error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/status
=======================================================================================================================================
Method: PATCH
Purpose: Change round status (OPEN/CLOSE) - Admin action from status flow
=======================================================================================================================================
*/
router.patch('/:id/rounds/:roundId/status', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const { status } = req.body;
    const user_id = req.user.id;

    // Validate status
    if (!status || !['OPEN', 'CLOSED'].includes(status)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Status must be either OPEN or CLOSED"
      });
    }

    // Verify user is the organiser
    const competitionCheck = await pool.query(
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
        message: "Only the competition organiser can change round status"
      });
    }

    // Update round status
    const result = await pool.query(`
      UPDATE round 
      SET status = $1 
      WHERE id = $2 AND competition_id = $3
      RETURNING *
    `, [status, round_id, competition_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        return_code: "ROUND_NOT_FOUND",
        message: "Round not found"
      });
    }

    const round = result.rows[0];

    // Log the action
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Round Status Changed', $3)
    `, [
      competition_id,
      user_id,
      `Changed Round ${round.round_number} status to ${status}`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: `Round ${round.round_number} ${status === 'OPEN' ? 'opened' : 'closed'} successfully`,
      round: round
    });

  } catch (error) {
    console.error('Change round status error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/results
=======================================================================================================================================
Method: GET
Purpose: Get round data for applying results (fixtures and picks)
=======================================================================================================================================
*/
router.get('/:id/rounds/:roundId/results', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const user_id = req.user.id;

    // Verify user is the organiser
    const competitionCheck = await pool.query(
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
        message: "Only the competition organiser can apply results"
      });
    }

    // Get round details
    const roundResult = await pool.query(`
      SELECT r.id, r.round_number, r.status, r.lock_time
      FROM round r
      WHERE r.id = $1 AND r.competition_id = $2
    `, [round_id, competition_id]);

    if (roundResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "ROUND_NOT_FOUND",
        message: "Round not found"
      });
    }

    const round = roundResult.rows[0];

    // Get fixtures for this round
    const fixturesResult = await pool.query(`
      SELECT f.id, f.home_team, f.away_team, f.home_team_short, f.away_team_short, f.kickoff_time, f.result
      FROM fixture f
      WHERE f.round_id = $1
      ORDER BY f.kickoff_time ASC
    `, [round_id]);

    // Get all picks for this round
    const picksResult = await pool.query(`
      SELECT p.id, p.user_id, p.team, p.fixture_id, p.outcome,
             u.display_name
      FROM pick p
      JOIN app_user u ON p.user_id = u.id
      WHERE p.round_id = $1
      ORDER BY u.display_name ASC
    `, [round_id]);

    res.json({
      return_code: "SUCCESS",
      round: round,
      fixtures: fixturesResult.rows,
      picks: picksResult.rows
    });

  } catch (error) {
    console.error('Get results data error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/results
=======================================================================================================================================
Method: POST
Purpose: Apply fixture results and update pick outcomes
=======================================================================================================================================
Request Payload:
{
  "fixture_results": [
    {
      "fixture_id": 123,
      "result": "home_win" | "away_win" | "draw"
    }
  ]
}
=======================================================================================================================================
*/
router.post('/:id/rounds/:roundId/results', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const { fixture_results } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!fixture_results || !Array.isArray(fixture_results)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Fixture results are required"
      });
    }

    // Verify user is the organiser
    const competitionCheck = await pool.query(
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
        message: "Only the competition organiser can apply results"
      });
    }

    // Verify round exists and is CLOSED
    const roundCheck = await pool.query(
      'SELECT id, round_number, status FROM round WHERE id = $1 AND competition_id = $2',
      [round_id, competition_id]
    );

    if (roundCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "ROUND_NOT_FOUND", 
        message: "Round not found"
      });
    }

    const round = roundCheck.rows[0];

    if (round.status !== 'CLOSED') {
      return res.status(400).json({
        return_code: "ROUND_NOT_CLOSED",
        message: "Can only apply results to closed rounds"
      });
    }

    let updatedFixtures = 0;

    // Process each fixture result
    for (const fixtureResult of fixture_results) {
      const { fixture_id, result } = fixtureResult;

      if (!['home_win', 'away_win', 'draw'].includes(result)) {
        return res.status(400).json({
          return_code: "VALIDATION_ERROR",
          message: `Invalid result: ${result}. Must be home_win, away_win, or draw`
        });
      }

      // Get fixture details
      const fixtureDetails = await pool.query(
        'SELECT home_team_short, away_team_short FROM fixture WHERE id = $1 AND round_id = $2',
        [fixture_id, round_id]
      );

      if (fixtureDetails.rows.length === 0) {
        continue; // Skip if fixture not found
      }

      const fixture = fixtureDetails.rows[0];

      // Determine result string for database storage
      let resultString;
      if (result === 'home_win') {
        resultString = fixture.home_team_short;
      } else if (result === 'away_win') {
        resultString = fixture.away_team_short;
      } else {
        resultString = 'DRAW';
      }

      // Update fixture with result
      const updateResult = await pool.query(`
        UPDATE fixture 
        SET result = $1
        WHERE id = $2 AND round_id = $3
        RETURNING id
      `, [resultString, fixture_id, round_id]);

      if (updateResult.rowCount > 0) {
        updatedFixtures++;
      }
    }

    // Clear any existing pick outcomes (as requested)
    await pool.query(`
      UPDATE pick 
      SET outcome = NULL
      WHERE round_id = $1
    `, [round_id]);

    // Log the action
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Results Applied', $3)
    `, [
      competition_id,
      user_id,
      `Applied results for Round ${round.round_number}, updated ${updatedFixtures} fixtures`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: `Results applied successfully. ${updatedFixtures} fixture${updatedFixtures !== 1 ? 's' : ''} updated.`,
      updated_fixtures: updatedFixtures
    });

  } catch (error) {
    console.error('Apply results error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR", 
      message: "Internal server error"
    });
  }
});

/*
=======================================================================================================================================
API Route: competitions/:id/rounds/:roundId/calculate-winners
=======================================================================================================================================
Method: POST
Purpose: Calculate pick outcomes based on fixture results
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "message": "Pick outcomes calculated successfully",
  "results": {
    "winners": 5,
    "losers": 3,
    "draws": 2
  }
}
=======================================================================================================================================
*/
router.post('/:id/rounds/:roundId/calculate-winners', verifyToken, async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const user_id = req.user.id;

    // Verify user is the organiser
    const competitionCheck = await pool.query(
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
        message: "Only the competition organiser can calculate winners"
      });
    }

    // Get round details
    const roundResult = await pool.query(`
      SELECT r.id, r.round_number, r.status
      FROM round r
      WHERE r.id = $1 AND r.competition_id = $2
    `, [round_id, competition_id]);

    if (roundResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "ROUND_NOT_FOUND",
        message: "Round not found"
      });
    }

    // Get all picks and their corresponding fixture results
    const picksAndResults = await pool.query(`
      SELECT p.id as pick_id, p.team, p.fixture_id, p.user_id,
             f.home_team, f.away_team, f.home_team_short, f.away_team_short, f.result,
             u.display_name
      FROM pick p
      JOIN fixture f ON p.fixture_id = f.id
      JOIN app_user u ON p.user_id = u.id
      WHERE p.round_id = $1
    `, [round_id]);

    if (picksAndResults.rows.length === 0) {
      return res.status(400).json({
        return_code: "NO_PICKS",
        message: "No picks found for this round"
      });
    }

    let winners = 0;
    let losers = 0;
    let draws = 0;
    let unresolved = 0;

    // Calculate outcomes for each pick
    for (const pick of picksAndResults.rows) {
      let outcome = null;

      if (!pick.result) {
        // No result set for this fixture yet
        unresolved++;
        continue;
      }

      if (pick.result === 'DRAW') {
        // Draw - all picks get draw outcome
        outcome = 'DRAW';
        draws++;
      } else if (pick.result === pick.home_team_short || pick.result === pick.away_team_short) {
        // Check if the pick matches the winning team
        if (pick.team === pick.home_team && pick.result === pick.home_team_short) {
          // Picked home team and home team won
          outcome = 'WIN';
          winners++;
        } else if (pick.team === pick.away_team && pick.result === pick.away_team_short) {
          // Picked away team and away team won
          outcome = 'WIN';
          winners++;
        } else {
          // Picked wrong team
          outcome = 'LOSE';
          losers++;
        }
      }

      // Update the pick with the calculated outcome
      if (outcome) {
        await pool.query(`
          UPDATE pick 
          SET outcome = $1
          WHERE id = $2
        `, [outcome, pick.pick_id]);
      }
    }

    if (unresolved > 0) {
      return res.status(400).json({
        return_code: "INCOMPLETE_RESULTS",
        message: `Cannot calculate winners: ${unresolved} fixture(s) still need results`
      });
    }

    // Log the calculation
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Winners Calculated', $3)
    `, [
      competition_id,
      user_id,
      `Calculated outcomes for Round ${roundResult.rows[0].round_number}: ${winners} winners, ${losers} losers, ${draws} draws`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Pick outcomes calculated successfully",
      results: {
        winners,
        losers,
        draws,
        total: winners + losers + draws
      }
    });

  } catch (error) {
    console.error('Calculate winners error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;