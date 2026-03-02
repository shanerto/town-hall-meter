import db from '../db.js';

/**
 * Creates a town hall for the coming Wednesday, preserving all historical data.
 *
 * Intended to run every Sunday at midnight so the new week's town hall is
 * ready before each Wednesday session.
 *
 * @returns {Promise<string>} The date string (YYYY-MM-DD) of the new town hall.
 */
export async function performWeeklyReset() {
  // From Sunday, Wednesday is always +3 days.
  const nextWed = new Date();
  nextWed.setDate(nextWed.getDate() + 3);
  const dateStr = nextWed.toISOString().split('T')[0];

  await db.execute({
    sql: 'INSERT INTO town_halls (date, title) VALUES (?, ?) ON CONFLICT (date) DO NOTHING',
    args: [dateStr, 'Town Hall'],
  });

  return dateStr;
}
