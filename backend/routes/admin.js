import { Router } from 'express';
import db from '../db.js';
import { performWeeklyReset } from '../lib/weeklyReset.js';

const router = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ISO week helpers
function getISOWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getFullYear(), week: weekNum };
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() - dayOfWeek + 1); // rewind to Monday
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(weekStartStr) {
  const d = new Date(weekStartStr + 'T12:00:00');
  return 'Week of ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const EMOJIS = ['😕', '🙂', '😐', '😄', '🚀'];
const LABELS = ['Not it', 'Okay-ish', 'Did the job', 'Really good', "Let's go"];

// GET /api/admin/townhalls
router.get('/townhalls', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT th.id, th.date, th.title, th.created_at,
             COUNT(v.id) as total_responses,
             AVG(CAST(v.rating AS REAL)) as average
      FROM town_halls th
      LEFT JOIN votes v ON v.town_hall_id = th.id
      GROUP BY th.id, th.date, th.title, th.created_at
      ORDER BY th.date DESC
    `);
    res.json(result.rows.map((r) => ({
      ...r,
      id: Number(r.id),
      total_responses: Number(r.total_responses),
      average: r.average != null ? Math.round(Number(r.average) * 100) / 100 : null,
    })));
  } catch (err) { next(err); }
});

// POST /api/admin/townhalls
router.post('/townhalls', requireAdmin, async (req, res, next) => {
  try {
    const { date, title } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

    try {
      const result = await db.execute({
        sql: 'INSERT INTO town_halls (date, title) VALUES (?, ?) RETURNING *',
        args: [date, title || null],
      });
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505' || err.message?.includes('unique')) {
        return res.status(409).json({ error: 'A town hall with that date already exists' });
      }
      throw err;
    }
  } catch (err) { next(err); }
});

// PUT /api/admin/townhalls/:id
router.put('/townhalls/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, title } = req.body;

    const thResult = await db.execute({ sql: 'SELECT id FROM town_halls WHERE id = ?', args: [id] });
    if (thResult.rows.length === 0) return res.status(404).json({ error: 'Town hall not found' });

    const updates = [];
    const args = [];
    if (date !== undefined) { updates.push('date = ?'); args.push(date); }
    if (title !== undefined) { updates.push('title = ?'); args.push(title); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    args.push(id);
    await db.execute({ sql: `UPDATE town_halls SET ${updates.join(', ')} WHERE id = ?`, args });

    const updated = await db.execute({ sql: 'SELECT * FROM town_halls WHERE id = ?', args: [id] });
    res.json(updated.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/admin/townhalls/:id
router.delete('/townhalls/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const thResult = await db.execute({ sql: 'SELECT id FROM town_halls WHERE id = ?', args: [id] });
    if (thResult.rows.length === 0) return res.status(404).json({ error: 'Town hall not found' });

    await db.execute({ sql: 'DELETE FROM town_halls WHERE id = ?', args: [id] });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/admin/export
router.get('/export', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT th.date, th.title, v.user_id, v.rating, v.emoji, v.emoji_label, v.comment, v.timestamp
      FROM votes v
      JOIN town_halls th ON th.id = v.town_hall_id
      ORDER BY th.date DESC, v.timestamp DESC
    `);

    const headers = ['date', 'week', 'user_id', 'rating', 'emoji', 'emoji_label', 'comment', 'timestamp'];
    const csv = [
      headers.join(','),
      ...result.rows.map((r) => {
        const { year, week } = getISOWeek(r.date);
        const weekStr = `${year}-W${String(week).padStart(2, '0')}`;
        return [r.date, weekStr, r.user_id, r.rating, r.emoji, r.emoji_label, r.comment ?? '', r.timestamp]
          .map((v) => JSON.stringify(v ?? ''))
          .join(',');
      }),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="town-hall-votes.csv"');
    res.send(csv);
  } catch (err) { next(err); }
});

// GET /api/admin/townhalls/:id/distribution
router.get('/townhalls/:id/distribution', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const thResult = await db.execute({ sql: 'SELECT * FROM town_halls WHERE id = ?', args: [id] });
    if (thResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const distResult = await db.execute({
      sql: `SELECT rating, emoji, emoji_label, COUNT(*) as count
            FROM votes WHERE town_hall_id = ?
            GROUP BY rating, emoji, emoji_label ORDER BY rating`,
      args: [id],
    });
    const statsResult = await db.execute({
      sql: 'SELECT COUNT(*) as total, AVG(CAST(rating AS REAL)) as average FROM votes WHERE town_hall_id = ?',
      args: [id],
    });
    const stats = statsResult.rows[0];

    res.json({
      townHall: thResult.rows[0],
      average: stats.average != null ? Math.round(Number(stats.average) * 100) / 100 : null,
      totalResponses: Number(stats.total),
      distribution: distResult.rows,
    });
  } catch (err) { next(err); }
});

// GET /api/admin/results — all town halls grouped by ISO calendar week, with stats + comments
router.get('/results', requireAdmin, async (req, res, next) => {
  try {
    const thResult = await db.execute(`
      SELECT id, date, title FROM town_halls ORDER BY date DESC
    `);

    if (thResult.rows.length === 0) return res.json([]);

    // Fetch all votes in one query
    const votesResult = await db.execute(`
      SELECT town_hall_id, rating, emoji, emoji_label, comment, timestamp
      FROM votes
      ORDER BY town_hall_id, timestamp DESC
    `);

    // Group votes by town_hall_id
    const votesByTh = new Map();
    for (const v of votesResult.rows) {
      const thId = Number(v.town_hall_id);
      if (!votesByTh.has(thId)) votesByTh.set(thId, []);
      votesByTh.get(thId).push(v);
    }

    const weekMap = new Map();

    for (const th of thResult.rows) {
      const thVotes = votesByTh.get(Number(th.id)) || [];

      // Aggregate stats
      const distMap = new Map();
      let sum = 0;
      for (const v of thVotes) {
        const r = Number(v.rating);
        distMap.set(r, (distMap.get(r) || 0) + 1);
        sum += r;
      }

      const distribution = [1, 2, 3, 4, 5].map((r) => ({
        rating: r,
        emoji: EMOJIS[r - 1],
        label: LABELS[r - 1],
        count: distMap.get(r) || 0,
      }));

      const totalResponses = thVotes.length;
      const average = totalResponses > 0 ? Math.round((sum / totalResponses) * 100) / 100 : null;

      const comments = thVotes
        .filter((v) => v.comment && v.comment.trim())
        .map((v) => ({
          rating: Number(v.rating),
          emoji: v.emoji,
          emojiLabel: v.emoji_label,
          comment: v.comment,
          timestamp: v.timestamp,
        }));

      const { year, week } = getISOWeek(th.date);
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
      const weekStart = getWeekStart(th.date);

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekKey,
          weekStart,
          weekLabel: formatWeekLabel(weekStart),
          townHalls: [],
        });
      }

      weekMap.get(weekKey).townHalls.push({
        id: Number(th.id),
        date: th.date,
        title: th.title,
        average,
        totalResponses,
        distribution,
        comments,
      });
    }

    // Sort weeks newest first
    const weeks = Array.from(weekMap.values()).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
    res.json(weeks);
  } catch (err) { next(err); }
});

// POST /api/admin/weekly-reset
// Called by Vercel Cron every Sunday (x-vercel-cron: 1) or manually with admin token.
router.post('/weekly-reset', async (req, res, next) => {
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const auth = req.headers['authorization'];
  if (!isVercelCron && auth !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const nextTownHall = await performWeeklyReset();
    console.log(`[weekly-reset] Done. Next town hall: ${nextTownHall}`);
    res.json({ success: true, nextTownHall });
  } catch (err) { next(err); }
});

export default router;
