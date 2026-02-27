import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/townhalls/current
router.get('/current', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let result = await db.execute({
      sql: 'SELECT * FROM town_halls WHERE date <= ? ORDER BY date DESC LIMIT 1',
      args: [today],
    });

    let th = result.rows[0];
    if (!th) {
      result = await db.execute('SELECT * FROM town_halls ORDER BY date ASC LIMIT 1');
      th = result.rows[0];
    }

    if (!th) return res.status(404).json({ error: 'No town halls found' });
    res.json(th);
  } catch (err) { next(err); }
});

// GET /api/townhalls/:id/results
// Returns aggregated results only if the requesting user has already voted.
router.get('/:id/results', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Missing user ID' });

    const thResult = await db.execute({
      sql: 'SELECT * FROM town_halls WHERE id = ?',
      args: [id],
    });
    const th = thResult.rows[0];
    if (!th) return res.status(404).json({ error: 'Town hall not found' });

    const voteCheck = await db.execute({
      sql: 'SELECT id FROM votes WHERE town_hall_id = ? AND user_id = ?',
      args: [id, userId],
    });
    if (voteCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Vote first to see results' });
    }

    const distResult = await db.execute({
      sql: `SELECT rating, emoji, emoji_label, COUNT(*) as count
            FROM votes WHERE town_hall_id = ?
            GROUP BY rating, emoji, emoji_label ORDER BY rating`,
      args: [id],
    });

    const emojis = ['😕', '🙂', '😐', '😄', '🚀'];
    const labels = ['Not it', 'Okay-ish', 'Did the job', 'Really good', "Let's go"];
    const fullDistribution = [1, 2, 3, 4, 5].map((r) => {
      const found = distResult.rows.find((d) => Number(d.rating) === r);
      return { rating: r, emoji: emojis[r - 1], label: labels[r - 1], count: found ? Number(found.count) : 0 };
    });

    const statsResult = await db.execute({
      sql: 'SELECT COUNT(*) as total, AVG(CAST(rating AS REAL)) as average FROM votes WHERE town_hall_id = ?',
      args: [id],
    });
    const stats = statsResult.rows[0];

    const trendResult = await db.execute({
      sql: `SELECT th.id, th.date, th.title,
                   COUNT(v.id) as total_responses,
                   AVG(CAST(v.rating AS REAL)) as average
            FROM town_halls th
            LEFT JOIN votes v ON v.town_hall_id = th.id
            WHERE th.date <= ?
            GROUP BY th.id
            ORDER BY th.date DESC
            LIMIT 10`,
      args: [th.date],
    });
    const trend = [...trendResult.rows].reverse().map((r) => ({
      id: Number(r.id),
      date: r.date,
      title: r.title,
      total_responses: Number(r.total_responses),
      average: r.average != null ? Math.round(Number(r.average) * 100) / 100 : 0,
    }));

    res.json({
      townHall: th,
      average: stats.average != null ? Math.round(Number(stats.average) * 100) / 100 : 0,
      totalResponses: Number(stats.total),
      distribution: fullDistribution,
      trend,
    });
  } catch (err) { next(err); }
});

export default router;
