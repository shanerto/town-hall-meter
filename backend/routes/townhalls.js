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

export default router;
