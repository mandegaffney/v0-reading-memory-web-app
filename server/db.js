'use strict';

const Database   = require('better-sqlite3');
const path       = require('path');
const fs         = require('fs');
const { randomUUID } = require('crypto');

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_BOOKS_FOR_FAVORITE_AUTHOR = 2;

// ── Database setup ────────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'library.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    author       TEXT NOT NULL DEFAULT '',
    genre        TEXT NOT NULL DEFAULT '',
    date_ordered TEXT NOT NULL DEFAULT '',
    unit_price   TEXT NOT NULL DEFAULT '',
    total_amount TEXT NOT NULL DEFAULT '',
    order_status TEXT NOT NULL DEFAULT '',
    order_id     TEXT NOT NULL DEFAULT '',
    source       TEXT NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('csv', 'manual')),
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS authors (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    is_hidden  INTEGER NOT NULL DEFAULT 0,
    is_manual  INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Keep the authors table in sync with the books table.
 * Called after every import, book-add, or book-delete.
 *
 * Rules:
 *  - Any author with ≥ MIN_BOOKS_FOR_FAVORITE_AUTHOR books is promoted
 *    (inserted if not already present; existing is_hidden / is_manual flags
 *    are left untouched).
 *  - Any non-manual author who falls below the threshold is removed.
 *  - Manual authors (is_manual = 1) are never auto-removed.
 */
function syncAuthors() {
  const insertAuthor = db.prepare(`
    INSERT OR IGNORE INTO authors (id, name, is_hidden, is_manual)
    VALUES (?, ?, 0, 0)
  `);

  // Promote newly-qualified authors
  const qualified = db.prepare(`
    SELECT author AS name
    FROM   books
    WHERE  author != ''
    GROUP  BY lower(author)
    HAVING COUNT(*) >= ?
  `).all(MIN_BOOKS_FOR_FAVORITE_AUTHOR);

  for (const { name } of qualified) {
    insertAuthor.run(randomUUID(), name);
  }

  // Remove auto-added authors who no longer qualify
  db.prepare(`
    DELETE FROM authors
    WHERE is_manual = 0
      AND lower(name) NOT IN (
        SELECT lower(author)
        FROM   books
        WHERE  author != ''
        GROUP  BY lower(author)
        HAVING COUNT(*) >= ?
      )
  `).run(MIN_BOOKS_FOR_FAVORITE_AUTHOR);
}

/**
 * Return all visible favorite authors with their book counts.
 * Result is already in the camelCase API shape.
 */
function getFavoriteAuthors() {
  return db
    .prepare(`
      SELECT
        a.id,
        a.name,
        COUNT(b.id) AS book_count
      FROM   authors a
      LEFT   JOIN books b ON lower(b.author) = lower(a.name)
      WHERE  a.is_hidden = 0
      GROUP  BY a.id
      ORDER  BY COUNT(b.id) DESC, a.name ASC
    `)
    .all()
    .map(row => ({
      id:        row.id,
      name:      row.name,
      bookCount: row.book_count,
    }));
}

/**
 * Map a DB row (snake_case columns) → API response shape (camelCase).
 */
function bookToApi(row) {
  return {
    id:          row.id,
    title:       row.title,
    author:      row.author,
    genre:       row.genre,
    dateOrdered: row.date_ordered,
    unitPrice:   row.unit_price,
    totalAmount: row.total_amount,
    orderStatus: row.order_status,
    orderId:     row.order_id,
    source:      row.source,
  };
}

module.exports = { db, syncAuthors, getFavoriteAuthors, bookToApi, MIN_BOOKS_FOR_FAVORITE_AUTHOR };
