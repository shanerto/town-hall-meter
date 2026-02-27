import { Router } from 'express';
import db from '../db.js';

const router = Router();

const EMOJIS = ['😕', '🙂', '😐', '😄', '🚀'];
const LABELS = ['Not it', 'Okay-ish', 'Did the job', 'Really good', "Let's go"];

// GET /api/votes/status?townhallId=X
router.get('/status', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { townhallId } = req.query;

    if (!userId || !townhallId) {
      return res.status(400).json({ error: 'Missing userId or townhallId' });
    }

    const result = await db.execute({
      sql: 'SELECT rating, emoji, emoji_label FROM votes WHERE town_hall_id = ? AND user_id = ?',
      args: [townhallId, userId],
    });

    const vote = result.rows[0] ?? null;
    res.json({ hasVoted: !!vote, vote });
  } catch (err) { next(err); }
});

// POST /api/votes
router.post('/', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { townHallId, rating } = req.body;

    if (!userId) return res.status(401).json({ error: 'Missing user ID' });
    if (!townHallId || !rating) return res.status(400).json({ error: 'townHallId and rating are required' });

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const thResult = await db.execute({ sql: 'SELECT id FROM town_halls WHERE id = ?', args: [townHallId] });
    if (thResult.rows.length === 0) return res.status(404).json({ error: 'Town hall not found' });

    const emoji = EMOJIS[ratingNum - 1];
    const emojiLabel = LABELS[ratingNum - 1];

    try {
      await db.execute({
        sql: 'INSERT INTO votes (town_hall_id, user_id, rating, emoji, emoji_label) VALUES (?, ?, ?, ?, ?)',
        args: [townHallId, userId, ratingNum, emoji, emojiLabel],
      });
      res.status(201).json({ success: true, rating: ratingNum, emoji, emojiLabel });
    } catch (err) {
      if (err.code === '23505' || err.message?.includes('unique')) {
        return res.status(409).json({ error: 'You have already voted for this Town Hall' });
      }
      throw err;
    }
  } catch (err) { next(err); }
});

// PUT /api/votes  — update an existing vote
router.put('/', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { townHallId, rating } = req.body;

    if (!userId) return res.status(401).json({ error: 'Missing user ID' });
    if (!townHallId || !rating) return res.status(400).json({ error: 'townHallId and rating are required' });

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const emoji = EMOJIS[ratingNum - 1];
    const emojiLabel = LABELS[ratingNum - 1];

    await db.execute({
      sql: 'UPDATE votes SET rating = ?, emoji = ?, emoji_label = ? WHERE town_hall_id = ? AND user_id = ?',
      args: [ratingNum, emoji, emojiLabel, townHallId, userId],
    });

    res.json({ success: true, rating: ratingNum, emoji, emojiLabel });
  } catch (err) { next(err); }
});

export default router;
