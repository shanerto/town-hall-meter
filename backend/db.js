import { createClient } from '@libsql/client';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Connection ---
// Vercel production: set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
//   (free tier at turso.tech — HTTP transport, zero native compilation needed)
// Local dev: falls back to a local SQLite file via the native libsql binding
let config;
if (process.env.TURSO_DATABASE_URL) {
  config = {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
} else if (process.env.VERCEL) {
  // /tmp is the only writable path in Vercel's serverless environment.
  // Data resets on cold starts — set TURSO_DATABASE_URL for persistence.
  config = { url: 'file:/tmp/townhall.db' };
} else {
  const DATA_DIR = join(__dirname, 'data');
  mkdirSync(DATA_DIR, { recursive: true });
  config = { url: `file:${join(DATA_DIR, 'townhall.db')}` };
}

const db = createClient(config);

// --- Schema ---
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS town_halls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    title TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    town_hall_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    emoji TEXT NOT NULL,
    emoji_label TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (town_hall_id) REFERENCES town_halls(id) ON DELETE CASCADE,
    UNIQUE (town_hall_id, user_id)
  );
`);

// --- Seed ---
const existing = await db.execute('SELECT id FROM town_halls LIMIT 1');
if (existing.rows.length === 0) {
  const today = new Date().toISOString().split('T')[0];
  await db.execute({
    sql: 'INSERT OR IGNORE INTO town_halls (date, title) VALUES (?, ?)',
    args: [today, 'Town Hall'],
  });
}

export default db;
