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
router.get('/townhalls', requireAdmin, async (req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT th.id, th.date, th.title, th.created_at,
             COUNT(v.id) as total_responses,
             AVG(CAST(v.rating AS REAL)) as average
      FROM town_halls th
      LEFT JOIN votes v ON v.town_hall_id = th.id
      GROUP BY th.id
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
        sql: 'INSERT INTO town_halls (date, title) VALUES (?, ?)',
        args: [date, title || null],
      });
      const created = await db.execute({
        sql: 'SELECT * FROM town_halls WHERE id = ?',
        args: [Number(result.lastInsertRowid)],
      });
      res.status(201).json(created.rows[0]);
    } catch (err) {
      if (err.message?.includes('UNIQUE constraint')) {
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
      SELECT th.date, th.title, v.user_id, v.rating, v.emoji, v.emoji_label, v.timestamp
      FROM votes v
      JOIN town_halls th ON th.id = v.town_hall_id
      ORDER BY th.date DESC, v.timestamp DESC
    `);

    const headers = ['date', 'title', 'user_id', 'rating', 'emoji', 'emoji_label', 'timestamp'];
    const csv = [
      headers.join(','),
      ...result.rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
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
            GROUP BY rating ORDER BY rating`,
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

export default router;
