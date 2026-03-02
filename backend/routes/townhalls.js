import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/townhalls/current
// Always resolves to this week's Wednesday town hall, creating it if needed.
// Day offsets: Sun(0)→+3, Mon(1)→+2, Tue(2)→+1, Wed(3)→0, Thu(4)→-1, Fri(5)→-2, Sat(6)→-3
router.get('/current', async (req, res, next) => {
  try {
    const now = new Date();
    const wed = new Date(now);
    wed.setDate(now.getDate() + (3 - now.getDay()));
    const dateStr = wed.toISOString().split('T')[0];

    await db.execute({
      sql: 'INSERT INTO town_halls (date, title) VALUES (?, ?) ON CONFLICT (date) DO NOTHING',
      args: [dateStr, 'Town Hall'],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM town_halls WHERE date = ?',
      args: [dateStr],
    });

    if (!result.rows[0]) return res.status(404).json({ error: 'No town hall found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

export default router;
