'use strict';

const { createClient } = require('@libsql/client');
const { randomUUID }   = require('crypto');
const path             = require('path');
const fs               = require('fs');

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_BOOKS_FOR_FAVORITE_AUTHOR = 2;

// ── Client setup ──────────────────────────────────────────────────────────────
// Development  → embedded file-based SQLite (no Turso account needed)
// Production   → Turso remote database over HTTP (no native bindings needed)

function makeClient() {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({
      url:       process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  // Local dev: embedded SQLite file
  const dataDir = process.env.DATA_DIR ?? path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return createClient({ url: `file:${path.join(dataDir, 'library.db')}` });
}

const client = makeClient();

// ── Schema ────────────────────────────────────────────────────────────────────

async function initSchema() {
  await client.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS books (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        author       TEXT NOT NULL DEFAULT '',
        genre        TEXT NOT NULL DEFAULT '',
        date_ordered TEXT NOT NULL DEFAULT '',
        unit_price   TEXT NOT NULL DEFAULT '',
        total_amount TEXT NOT NULL DEFAULT '',
        order_status TEXT NOT NULL DEFAULT '',
        order_id     TEXT NOT NULL DEFAULT '',
        source       TEXT NOT NULL DEFAULT 'manual',
        created_at   INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS authors (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
        is_hidden  INTEGER NOT NULL DEFAULT 0,
        is_manual  INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
    },
  ], 'write');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Keep the authors table in sync with the current books.
 * - Authors with ≥ MIN_BOOKS_FOR_FAVORITE_AUTHOR books are promoted (if new).
 * - Non-manual authors who fall below the threshold are removed.
 * - Manual authors (is_manual = 1) are never auto-removed.
 */
async function syncAuthors() {
  // 1. Promote newly-qualified authors (INSERT OR IGNORE = skip existing rows)
  const { rows: qualified } = await client.execute({
    sql: `SELECT author AS name
          FROM   books
          WHERE  author != ''
          GROUP  BY lower(author)
          HAVING COUNT(*) >= ?`,
    args: [MIN_BOOKS_FOR_FAVORITE_AUTHOR],
  });

  if (qualified.length > 0) {
    await client.batch(
      qualified.map(row => ({
        sql:  'INSERT OR IGNORE INTO authors (id, name, is_hidden, is_manual) VALUES (?, ?, 0, 0)',
        args: [randomUUID(), String(row.name)],
      })),
      'write',
    );
  }

  // 2. Remove auto-added authors who no longer qualify
  await client.execute({
    sql: `DELETE FROM authors
          WHERE is_manual = 0
            AND lower(name) NOT IN (
              SELECT lower(author) FROM books
              WHERE  author != ''
              GROUP  BY lower(author)
              HAVING COUNT(*) >= ?
            )`,
    args: [MIN_BOOKS_FOR_FAVORITE_AUTHOR],
  });
}

/** Return visible favorite authors with book counts (API shape). */
async function getFavoriteAuthors() {
  const { rows } = await client.execute(`
    SELECT
      a.id,
      a.name,
      COUNT(b.id) AS book_count
    FROM   authors a
    LEFT   JOIN books b ON lower(b.author) = lower(a.name)
    WHERE  a.is_hidden = 0
    GROUP  BY a.id
    ORDER  BY COUNT(b.id) DESC, a.name ASC
  `);
  return rows.map(row => ({
    id:        String(row.id),
    name:      String(row.name),
    bookCount: Number(row.book_count),
  }));
}

/** Map a DB row (snake_case) → API response shape (camelCase). */
function bookToApi(row) {
  return {
    id:          String(row.id),
    title:       String(row.title),
    author:      String(row.author),
    genre:       String(row.genre),
    dateOrdered: String(row.date_ordered),
    unitPrice:   String(row.unit_price),
    totalAmount: String(row.total_amount),
    orderStatus: String(row.order_status),
    orderId:     String(row.order_id),
    source:      String(row.source),
  };
}

module.exports = {
  client,
  initSchema,
  syncAuthors,
  getFavoriteAuthors,
  bookToApi,
  randomUUID,
  MIN_BOOKS_FOR_FAVORITE_AUTHOR,
};
