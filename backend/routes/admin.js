import { Router } from 'express';
import db from '../db.js';

const router = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/admin/townhalls
router.get('/townhalls', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT th.id, th.date, th.title, th.created_at,
              COUNT(v.id) as total_responses,
              AVG(CAST(v.rating AS REAL)) as average
       FROM town_halls th
       LEFT JOIN votes v ON v.town_hall_id = th.id
       GROUP BY th.id
       ORDER BY th.date DESC`
    )
    .all();

  res.json(rows.map((r) => ({ ...r, average: r.average ? Math.round(r.average * 100) / 100 : null })));
});

// POST /api/admin/townhalls
router.post('/townhalls', requireAdmin, (req, res) => {
  const { date, title } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
  }

  try {
    const result = db
      .prepare('INSERT INTO town_halls (date, title) VALUES (?, ?)')
      .run(date, title || null);

    const created = db.prepare('SELECT * FROM town_halls WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'A town hall with that date already exists' });
    }
    throw err;
  }
});

// PUT /api/admin/townhalls/:id
router.put('/townhalls/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { date, title } = req.body;

  const th = db.prepare('SELECT id FROM town_halls WHERE id = ?').get(id);
  if (!th) {
    return res.status(404).json({ error: 'Town hall not found' });
  }

  const updates = [];
  const values = [];

  if (date !== undefined) {
    updates.push('date = ?');
    values.push(date);
  }
  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  values.push(id);
  db.prepare(`UPDATE town_halls SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM town_halls WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/admin/townhalls/:id
router.delete('/townhalls/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const th = db.prepare('SELECT id FROM town_halls WHERE id = ?').get(id);
  if (!th) {
    return res.status(404).json({ error: 'Town hall not found' });
  }

  db.prepare('DELETE FROM town_halls WHERE id = ?').run(id);
  res.json({ success: true });
});

// GET /api/admin/export
// Returns all votes as CSV
router.get('/export', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT th.date, th.title, v.user_id, v.rating, v.emoji, v.emoji_label, v.timestamp
       FROM votes v
       JOIN town_halls th ON th.id = v.town_hall_id
       ORDER BY th.date DESC, v.timestamp DESC`
    )
    .all();

  const headers = ['date', 'title', 'user_id', 'rating', 'emoji', 'emoji_label', 'timestamp'];
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="town-hall-votes.csv"');
  res.send(csv);
});

// GET /api/admin/townhalls/:id/distribution
router.get('/townhalls/:id/distribution', requireAdmin, (req, res) => {
  const { id } = req.params;
  const th = db.prepare('SELECT * FROM town_halls WHERE id = ?').get(id);
  if (!th) return res.status(404).json({ error: 'Not found' });

  const distribution = db
    .prepare(
      `SELECT rating, emoji, emoji_label, COUNT(*) as count
       FROM votes WHERE town_hall_id = ?
       GROUP BY rating ORDER BY rating`
    )
    .all(id);

  const stats = db
    .prepare('SELECT COUNT(*) as total, AVG(CAST(rating AS REAL)) as average FROM votes WHERE town_hall_id = ?')
    .get(id);

  res.json({
    townHall: th,
    average: stats.average ? Math.round(stats.average * 100) / 100 : null,
    totalResponses: stats.total,
    distribution,
  });
});

export default router;
