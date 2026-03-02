import db from '../db.js';

/**
 * Wipes all town halls (and their votes via CASCADE) then creates a fresh
 * town hall for the coming Wednesday.
 *
 * Intended to run every Sunday at midnight so the slate is clean before
 * each Wednesday session.
 *
 * @returns {Promise<string>} The date string (YYYY-MM-DD) of the new town hall.
 */
export async function performWeeklyReset() {
  // Remove everything — votes are deleted automatically via ON DELETE CASCADE.
  await db.execute('DELETE FROM town_halls');

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
