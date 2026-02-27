import { neon } from '@neondatabase/serverless';

// Lazy-initialized so a bad DATABASE_URL surfaces as a JSON 500
// inside Express rather than killing the module on cold start.
let sql = null;
let initPromise = null;

async function doInit() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.'
    );
  }

  sql = neon(process.env.DATABASE_URL);

  // Schema
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

  // Seed
  const seed = await sql`SELECT id FROM town_halls LIMIT 1`;
  if (seed.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    await sql`
      INSERT INTO town_halls (date, title)
      VALUES (${today}, 'Town Hall')
      ON CONFLICT DO NOTHING
    `;
  }
}

function ensureReady() {
  if (!initPromise) {
    initPromise = doInit().catch((err) => {
      initPromise = null; // allow retry on next request
      throw err;
    });
  }
  return initPromise;
}

// Thin wrapper — keeps existing { sql, args } call signatures in routes.
// Converts SQLite-style ? placeholders → PostgreSQL $1, $2, …
const db = {
  async execute(queryOrText) {
    await ensureReady();

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
