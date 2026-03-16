const express = require('express');
const pool = require('./db');
const { verifyToken } = require('./auth');

const router = express.Router();

// GET /dashboard/stats - Get user's dashboard stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT total_points, games_played, games_won, games_hosted, 
              correct_answers, total_answers
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const accuracy = user.total_answers > 0 
      ? Math.round((user.correct_answers / user.total_answers) * 100) 
      : 0;

    const winRate = user.games_played > 0 
      ? Math.round((user.games_won / user.games_played) * 100) 
      : 0;

    const topicsResult = await pool.query(
      `SELECT COUNT(DISTINCT g.topic) as topics_count
       FROM game_players gp
       JOIN games g ON gp.game_id = g.id
       WHERE gp.user_id = $1 AND g.status = 'finished'`,
      [req.user.id]
    );

    const rankResult = await pool.query(
      `SELECT COUNT(*) + 1 as rank 
       FROM users 
       WHERE total_points > (SELECT total_points FROM users WHERE id = $1)`,
      [req.user.id]
    );

    res.json({
      totalPoints: user.total_points,
      gamesPlayed: user.games_played,
      gamesWon: user.games_won,
      gamesHosted: user.games_hosted,
      correctAnswers: user.correct_answers,
      totalAnswers: user.total_answers,
      accuracy,
      winRate,
      topicsStudied: parseInt(topicsResult.rows[0].topics_count) || 0,
      rank: parseInt(rankResult.rows[0].rank) || 0
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET /dashboard/games-created
router.get('/games-created', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT g.id, g.game_code, g.name, g.topic, g.status, g.total_questions,
              g.created_at, g.finished_at,
              (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count
       FROM games g
       WHERE g.host_id = $1
       ORDER BY g.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ games: result.rows });

  } catch (error) {
    console.error('Games created error:', error);
    res.status(500).json({ error: 'Failed to get games' });
  }
});

// GET /dashboard/games-played
router.get('/games-played', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT g.id, g.game_code, g.name, g.topic, g.total_questions,
              gp.score, gp.correct_answers, gp.total_answers, gp.final_rank,
              gp.joined_at, g.finished_at
       FROM game_players gp
       JOIN games g ON gp.game_id = g.id
       WHERE gp.user_id = $1 AND g.status = 'finished'
       ORDER BY g.finished_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ games: result.rows });

  } catch (error) {
    console.error('Games played error:', error);
    res.status(500).json({ error: 'Failed to get games' });
  }
});

// GET /dashboard/topics
router.get('/topics', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.topic, COUNT(*) as games_count, 
              SUM(gp.score) as total_points,
              AVG(gp.correct_answers::float / NULLIF(gp.total_answers, 0) * 100) as avg_accuracy
       FROM game_players gp
       JOIN games g ON gp.game_id = g.id
       WHERE gp.user_id = $1 AND g.status = 'finished' AND g.topic IS NOT NULL
       GROUP BY g.topic
       ORDER BY games_count DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({ topics: result.rows });

  } catch (error) {
    console.error('Topics error:', error);
    res.status(500).json({ error: 'Failed to get topics' });
  }
});

// GET /dashboard/leaderboard - Global leaderboard (no auth required)
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const result = await pool.query(
      `SELECT id, username, total_points, games_played, games_won
       FROM users
       WHERE games_played > 0
       ORDER BY total_points DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ leaderboard: result.rows });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;
