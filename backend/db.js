import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

// Vercel Functions are read-only except for /tmp. Note: /tmp is ephemeral and
// not shared across function instances. For production on Vercel, replace this
// with a persistent database such as Turso (libsql) or Vercel Postgres.
const isVercel = !!process.env.VERCEL;
const DB_PATH = isVercel ? '/tmp/townhall.db' : join(DATA_DIR, 'townhall.db');

if (!isVercel) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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

// Seed a current town hall if none exists
const existing = db.prepare('SELECT id FROM town_halls LIMIT 1').get();
if (!existing) {
  const today = new Date().toISOString().split('T')[0];
  db.prepare('INSERT OR IGNORE INTO town_halls (date, title) VALUES (?, ?)').run(
    today,
    'Town Hall'
  );
}

export default db;
