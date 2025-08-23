/*
=======================================================================================================================================
Competition Routes - API endpoints for managing competitions
=======================================================================================================================================
Purpose: Handle competition creation, retrieval, and management
=======================================================================================================================================
*/

const express = require('express');
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
router.post('/create', async (req, res) => {
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
    const organiser_id = 1; // This should come from authenticated user

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
    console.log('Generated invite code:', inviteCode); // Debug log

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
      VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, CURRENT_TIMESTAMP)
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
router.get('/my-competitions', async (req, res) => {
  try {
    // TODO: Get actual user ID from authentication middleware
    const user_id = 1;

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
        COUNT(cu.user_id) as player_count
      FROM competition c
      JOIN team_list tl ON c.team_list_id = tl.id
      LEFT JOIN competition_user cu ON c.id = cu.competition_id
      WHERE c.organiser_id = $1
      GROUP BY c.id, c.name, c.description, c.status, c.lives_per_player, c.no_team_twice, c.invite_code, c.created_at, tl.name
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
        created_at: row.created_at
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
router.post('/join', async (req, res) => {
  try {
    const { invite_code } = req.body;

    // Basic validation
    if (!invite_code || !invite_code.trim()) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Invite code is required"
      });
    }

    // TODO: Add authentication middleware to get actual user ID
    // For now, we'll use a placeholder
    const user_id = 1; // This should come from authenticated user

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
router.get('/:id/rounds', async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const user_id = 1; // TODO: Get from auth middleware

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
        r.created_at,
        COUNT(f.id) as fixture_count
      FROM round r
      LEFT JOIN fixture f ON r.id = f.round_id
      WHERE r.competition_id = $1
      GROUP BY r.id, r.round_number, r.lock_time, r.created_at
      ORDER BY r.round_number ASC
    `, [competition_id]);

    res.json({
      return_code: "SUCCESS",
      rounds: result.rows.map(row => ({
        id: row.id,
        round_number: row.round_number,
        lock_time: row.lock_time,
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
router.post('/:id/rounds', async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const { lock_time } = req.body;
    const user_id = 1; // TODO: Get from auth middleware

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
        created_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
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
router.get('/:id/rounds/:roundId/fixtures', async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const user_id = 1; // TODO: Get from auth middleware

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
router.post('/:id/rounds/:roundId/fixtures', async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const { home_team_id, away_team_id, kickoff_time } = req.body;
    const user_id = 1; // TODO: Get from auth middleware

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
      SELECT c.organiser_id, c.name as competition_name, r.round_number
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

    res.json({
      return_code: "SUCCESS",
      message: "Fixture added successfully",
      fixture: fixture
    });

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
router.put('/:id/rounds/:roundId', async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const { lock_time } = req.body;
    const user_id = 1; // TODO: Get from auth middleware

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

    res.json({
      return_code: "SUCCESS",
      message: "Round updated successfully",
      round: {
        id: updatedRound.id,
        round_number: updatedRound.round_number,
        lock_time: updatedRound.lock_time,
        created_at: updatedRound.created_at
      }
    });

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
router.delete('/:id/rounds/:roundId/fixtures/:fixtureId', async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const round_id = parseInt(req.params.roundId);
    const fixture_id = parseInt(req.params.fixtureId);
    const user_id = 1; // TODO: Get from auth middleware

    // Verify user is the organiser and get fixture details
    const verifyResult = await pool.query(`
      SELECT c.organiser_id, c.name as competition_name, r.round_number,
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
router.get('/:id/teams', async (req, res) => {
  try {
    const competition_id = parseInt(req.params.id);
    const user_id = 1; // TODO: Get from auth middleware

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

module.exports = router;