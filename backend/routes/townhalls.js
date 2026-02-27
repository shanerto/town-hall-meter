import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/townhalls/current
// Returns the most recent town hall (latest date <= today, or the next upcoming one)
router.get('/current', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  let th = db
    .prepare('SELECT * FROM town_halls WHERE date <= ? ORDER BY date DESC LIMIT 1')
    .get(today);

  if (!th) {
    th = db.prepare('SELECT * FROM town_halls ORDER BY date ASC LIMIT 1').get();
  }

  if (!th) {
    return res.status(404).json({ error: 'No town halls found' });
  }

  res.json(th);
});

// GET /api/townhalls/:id/results
// Returns aggregated results. Requires that the requesting user has already voted.
router.get('/:id/results', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Missing user ID' });
  }

  const th = db.prepare('SELECT * FROM town_halls WHERE id = ?').get(id);
  if (!th) {
    return res.status(404).json({ error: 'Town hall not found' });
  }

  const hasVoted = db
    .prepare('SELECT id FROM votes WHERE town_hall_id = ? AND user_id = ?')
    .get(id, userId);

  if (!hasVoted) {
    return res.status(403).json({ error: 'Vote first to see results' });
  }

  const distribution = db
    .prepare(
      `SELECT rating, emoji, emoji_label, COUNT(*) as count
       FROM votes WHERE town_hall_id = ?
       GROUP BY rating ORDER BY rating`
    )
    .all(id);

  const allRatings = [1, 2, 3, 4, 5];
  const emojis = ['😕', '🙂', '😐', '😄', '🚀'];
  const labels = ['Not it', 'Okay-ish', 'Did the job', 'Really good', "Let's go"];

  const fullDistribution = allRatings.map((r) => {
    const found = distribution.find((d) => d.rating === r);
    return {
      rating: r,
      emoji: emojis[r - 1],
      label: labels[r - 1],
      count: found ? found.count : 0,
    };
  });

  const stats = db
    .prepare(
      'SELECT COUNT(*) as total, AVG(CAST(rating AS REAL)) as average FROM votes WHERE town_hall_id = ?'
    )
    .get(id);

  // Trend: last 10 town halls (including this one) with average scores
  const trend = db
    .prepare(
      `SELECT th.id, th.date, th.title,
              COUNT(v.id) as total_responses,
              AVG(CAST(v.rating AS REAL)) as average
       FROM town_halls th
       LEFT JOIN votes v ON v.town_hall_id = th.id
       WHERE th.date <= ?
       GROUP BY th.id
       ORDER BY th.date DESC
       LIMIT 10`
    )
    .all(th.date)
    .reverse();

  res.json({
    townHall: th,
    average: stats.average ? Math.round(stats.average * 100) / 100 : 0,
    totalResponses: stats.total,
    distribution: fullDistribution,
    trend,
  });
});

export default router;
