/**
 * Shared SQLite Database Singleton
 *
 * Provides a centralised, WAL-mode SQLite database for all persistence
 * layers (users, alerts, webhooks, notifications, tenants, teams).
 *
 * Usage:
 *   import { getDb, runMigrations } from '@/lib/shared/database'
 *   runMigrations()
 *   const db = getDb()
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { migrations } from './migrations';

// ── Singleton ───────────────────────────────────────────────────────────
let _db: Database.Database | null = null;
let _migrated = false;

/**
 * Return (and lazily create) the shared database handle.
 * The DB file lives at `<cwd>/data/nezha.db`.
 */
export function getDb(dbPath?: string): Database.Database {
  if (_db) return _db;

  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const path = dbPath || join(dir, 'nezha.db');
  _db = new Database(path);

  // Performance pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -64000'); // 64 MB
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');

  return _db;
}

/**
 * Run all pending migrations.  Safe to call multiple times — each
 * migration is wrapped in CREATE TABLE IF NOT EXISTS / CREATE INDEX
 * IF NOT EXISTS so re-running is a no-op.
 */
export function runMigrations(dbPath?: string): void {
  if (_migrated) return;
  const db = getDb(dbPath);

  db.exec('BEGIN');
  try {
    for (const sql of migrations) {
      db.exec(sql);
    }
    db.exec('COMMIT');
    _migrated = true;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Close the database connection.  Useful for tests / graceful shutdown.
 */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    _migrated = false;
  }
}

// ── Convenience prepared-statement helpers ──────────────────────────────

/**
 * Build an INSERT OR REPLACE statement for the given table and columns.
 * Returns a prepared statement that accepts values in column order.
 */
export function upsertStmt(
  table: string,
  columns: string[],
): Database.Statement {
  const db = getDb();
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  return db.prepare(sql);
}

/**
 * Run multiple statements inside a single transaction (synchronous,
 * which is fine for better-sqlite3).
 */
export function runInTransaction(fn: (db: Database.Database) => void): void {
  const db = getDb();
  const tx = db.transaction(() => fn(db));
  tx();
}
