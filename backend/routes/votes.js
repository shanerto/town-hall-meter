import { Router } from 'express';
import db from '../db.js';

const router = Router();

const EMOJIS = ['😕', '🙂', '😐', '😄', '🚀'];
const LABELS = ['Not it', 'Okay-ish', 'Did the job', 'Really good', "Let's go"];

// GET /api/votes/status?townhallId=X
// Check if the requesting user has already voted for a given town hall
router.get('/status', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { townhallId } = req.query;

  if (!userId || !townhallId) {
    return res.status(400).json({ error: 'Missing userId or townhallId' });
  }

  const vote = db
    .prepare('SELECT rating, emoji, emoji_label FROM votes WHERE town_hall_id = ? AND user_id = ?')
    .get(townhallId, userId);

  res.json({ hasVoted: !!vote, vote: vote || null });
});

// POST /api/votes
// Submit a vote. Prevents duplicates per user per town hall.
router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { townHallId, rating } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Missing user ID' });
  }

  if (!townHallId || !rating) {
    return res.status(400).json({ error: 'townHallId and rating are required' });
  }

  const ratingNum = parseInt(rating, 10);
  if (ratingNum < 1 || ratingNum > 5 || isNaN(ratingNum)) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const th = db.prepare('SELECT id FROM town_halls WHERE id = ?').get(townHallId);
  if (!th) {
    return res.status(404).json({ error: 'Town hall not found' });
  }

  const emoji = EMOJIS[ratingNum - 1];
  const emojiLabel = LABELS[ratingNum - 1];

  try {
    db.prepare(
      'INSERT INTO votes (town_hall_id, user_id, rating, emoji, emoji_label) VALUES (?, ?, ?, ?, ?)'
    ).run(townHallId, userId, ratingNum, emoji, emojiLabel);

    res.status(201).json({ success: true, rating: ratingNum, emoji, emojiLabel });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'You have already voted for this Town Hall' });
    }
    throw err;
  }
});

export default router;
