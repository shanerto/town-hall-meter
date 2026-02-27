import { neon } from '@neondatabase/serverless';

// Set DATABASE_URL in your environment.
// Neon free tier: https://neon.tech  (also works with any PostgreSQL URL)
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Create a free database at neon.tech.');
}

const sql = neon(process.env.DATABASE_URL);

// --- Schema ---
await sql`
  CREATE TABLE IF NOT EXISTS town_halls (
    id         SERIAL PRIMARY KEY,
    date       TEXT NOT NULL UNIQUE,
    title      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS votes (
    id           SERIAL PRIMARY KEY,
    town_hall_id INTEGER NOT NULL REFERENCES town_halls(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL,
    rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    emoji        TEXT NOT NULL,
    emoji_label  TEXT NOT NULL,
    timestamp    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (town_hall_id, user_id)
  )
`;

// --- Seed ---
const seed = await sql`SELECT id FROM town_halls LIMIT 1`;
if (seed.length === 0) {
  const today = new Date().toISOString().split('T')[0];
  await sql`INSERT INTO town_halls (date, title) VALUES (${today}, 'Town Hall') ON CONFLICT DO NOTHING`;
}

// --- Thin wrapper so existing routes keep their call signatures ---
// Routes use db.execute({ sql: '...WHERE id = ?', args: [id] })
// This wrapper converts SQLite-style ? placeholders → PostgreSQL $1, $2, …
// and wraps the result in { rows } for compatibility.
const db = {
  async execute(queryOrText) {
    let text, params;
    if (typeof queryOrText === 'string') {
      text = queryOrText;
      params = [];
    } else {
      text = queryOrText.sql;
      params = queryOrText.args ?? [];
    }
    let n = 0;
    const pgText = text.replace(/\?/g, () => `$${++n}`);
    const rows = await sql(pgText, params);
    return { rows };
  },
};

export default db;
