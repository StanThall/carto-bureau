import { Pool } from 'pg'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS images (
      id        TEXT PRIMARY KEY,
      data      BYTEA NOT NULL,
      mime_type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      image_id TEXT NOT NULL REFERENCES images(id)
    );

    CREATE TABLE IF NOT EXISTS people (
      id         TEXT PRIMARY KEY,
      first_name TEXT NOT NULL DEFAULT '',
      last_name  TEXT NOT NULL DEFAULT '',
      team       TEXT NOT NULL DEFAULT '',
      role       TEXT NOT NULL DEFAULT '',
      work_mode  TEXT NOT NULL DEFAULT 'onsite'
    );

    CREATE TABLE IF NOT EXISTS seats (
      id        TEXT PRIMARY KEY,
      plan_id   TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      x         REAL NOT NULL,
      y         REAL NOT NULL,
      person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
      label     TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id      TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      x       REAL NOT NULL,
      y       REAL NOT NULL,
      content TEXT NOT NULL DEFAULT ''
    );
  `)
}
