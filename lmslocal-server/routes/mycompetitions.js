/*
=======================================================================================================================================
My Competitions Route - Get competitions user is involved in
=======================================================================================================================================
Purpose: Retrieve competitions where user is organiser or participant
=======================================================================================================================================
*/

const express = require('express');
const { query } = require('../database');
const verifyToken = require('../middleware/verifyToken');
const router = express.Router();


/*
=======================================================================================================================================
API Route: /mycompetitions
=======================================================================================================================================
Method: POST
Purpose: Get competitions where user is organiser or participant
=======================================================================================================================================
Success Response:
{
  "return_code": "SUCCESS",
  "competitions": [
    {
      "id": 123,
      "name": "Premier League LMS 2025",
      "status": "UNLOCKED",
      "player_count": 12,
      "team_list_name": "Premier League 2025-26",
      "is_organiser": true,
      "invite_code": "1.4567"
    }
  ]
}
=======================================================================================================================================
*/
router.post('/', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.status,
        c.lives_per_player,
        c.no_team_twice,
        c.invite_code,
        c.slug,
        c.created_at,
        c.team_list_id,
        tl.name as team_list_name,
        (SELECT COUNT(*) FROM competition_user cu WHERE cu.competition_id = c.id) as player_count,
        c.organiser_id,
        MAX(r.round_number) as current_round
      FROM competition c
      JOIN team_list tl ON c.team_list_id = tl.id
      LEFT JOIN competition_user cu_player ON c.id = cu_player.competition_id AND cu_player.user_id = $1
      LEFT JOIN round r ON c.id = r.competition_id
      WHERE (c.organiser_id = $1 OR cu_player.user_id = $1)
      GROUP BY c.id, c.name, c.description, c.status, c.lives_per_player, c.no_team_twice, c.invite_code, c.slug, c.created_at, c.team_list_id, tl.name, c.organiser_id
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
        slug: row.slug,
        team_list_id: row.team_list_id,
        team_list_name: row.team_list_name,
        player_count: parseInt(row.player_count),
        created_at: row.created_at,
        current_round: row.current_round,
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

module.exports = router;