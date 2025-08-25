/*
=======================================================================================================================================
Calculate Results Route
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
    const result = await pool.query('SELECT id, email, display_name, email_verified FROM app_user WHERE id = $1', [decoded.user_id || decoded.userId]);
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
API Route: /calculate-results
=======================================================================================================================================
Method: POST
Purpose: Calculate pick outcomes based on fixture results for a round
=======================================================================================================================================
Request Payload:
{
  "round_id": 1
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Pick outcomes calculated successfully",
  "results": {
    "winners": 5,
    "losers": 3,
    "draws": 2,
    "processed": 10,
    "skipped": 0
  }
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const { round_id } = req.body;
    const user_id = req.user.id;

    // Basic validation
    if (!round_id || !Number.isInteger(round_id)) {
      return res.status(400).json({
        return_code: "VALIDATION_ERROR",
        message: "Round ID is required and must be a number"
      });
    }

    // Get round details and verify user is organiser
    const roundResult = await pool.query(`
      SELECT r.id, r.round_number, r.competition_id, c.organiser_id, c.name as competition_name
      FROM round r
      JOIN competition c ON r.competition_id = c.id
      WHERE r.id = $1
    `, [round_id]);

    if (roundResult.rows.length === 0) {
      return res.status(404).json({
        return_code: "ROUND_NOT_FOUND",
        message: "Round not found"
      });
    }

    const round = roundResult.rows[0];

    if (round.organiser_id !== user_id) {
      return res.status(403).json({
        return_code: "UNAUTHORIZED",
        message: "Only the competition organiser can calculate results"
      });
    }


    // Get all picks with available fixture data (only those not already calculated)
    const picksAndResults = await pool.query(`
      SELECT p.id as pick_id, p.team, p.fixture_id, p.user_id, p.outcome,
             f.home_team, f.away_team, f.home_team_short, f.away_team_short, f.result,
             COALESCE(u.display_name, 'Unknown User') as display_name
      FROM pick p
      LEFT JOIN fixture f ON p.fixture_id = f.id
      LEFT JOIN app_user u ON p.user_id = u.id
      WHERE p.round_id = $1 AND p.outcome IS NULL
    `, [round_id]);

    let winners = 0;
    let losers = 0;
    let draws = 0;
    let processed = 0;
    let skipped = 0;
    let playersEliminated = 0;

    // Calculate outcomes for each pick
    for (const pick of picksAndResults.rows) {
      let outcome = null;

      // Skip picks without fixture data or results
      if (!pick.result || !pick.fixture_id) {
        skipped++;
        continue;
      }

      if (pick.result === 'DRAW') {
        // Draw - all picks get draw outcome
        outcome = 'DRAW';
        draws++;
      } else {
        // Check if the pick matches the winning team
        if (pick.team === pick.result) {
          // Player picked the winning team
          outcome = 'WIN';
          winners++;
        } else {
          // Player picked a different team than the winner
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
        processed++;

        // If player lost, reduce their lives and potentially eliminate them
        if (outcome === 'LOSE') {
          // Get current lives for this user
          const livesResult = await pool.query(`
            SELECT lives_remaining, status
            FROM competition_user
            WHERE competition_id = $1 AND user_id = $2
          `, [round.competition_id, pick.user_id]);

          if (livesResult.rows.length > 0) {
            const currentLives = livesResult.rows[0].lives_remaining;
            const newLives = currentLives - 1;

            if (newLives < 0) {
              // Player would go to -1 lives - eliminate them (set to 0 for tidiness)
              await pool.query(`
                UPDATE competition_user
                SET lives_remaining = 0, status = 'OUT'
                WHERE competition_id = $1 AND user_id = $2
              `, [round.competition_id, pick.user_id]);
              playersEliminated++;
            } else {
              // Player still survives (even at 0 lives)
              await pool.query(`
                UPDATE competition_user
                SET lives_remaining = $1
                WHERE competition_id = $2 AND user_id = $3
              `, [newLives, round.competition_id, pick.user_id]);
            }
          }
        }
      }
    }

    // Log the calculation
    await pool.query(`
      INSERT INTO audit_log (competition_id, user_id, action, details)
      VALUES ($1, $2, 'Results Calculated', $3)
    `, [
      round.competition_id,
      user_id,
      `Calculated outcomes for Round ${round.round_number}: ${processed} picks processed (${winners} winners, ${losers} losers, ${draws} draws), ${playersEliminated} players eliminated, ${skipped} skipped`
    ]);

    res.json({
      return_code: "SUCCESS",
      message: "Pick outcomes calculated successfully",
      results: {
        winners,
        losers,
        draws,
        processed,
        skipped,
        playersEliminated,
        total: winners + losers + draws
      }
    });

  } catch (error) {
    console.error('Calculate results error:', error);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
});

module.exports = router;