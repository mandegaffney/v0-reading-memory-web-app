'use strict';

const { createClient } = require('@libsql/client');
const { randomUUID }   = require('crypto');
const path             = require('path');
const fs               = require('fs');

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_BOOKS_FOR_FAVORITE_AUTHOR = 2;

// ── Client setup ──────────────────────────────────────────────────────────────
//
// Priority order:
//   1. TURSO_DATABASE_URL set → Turso remote DB (pure HTTP, works everywhere)
//   2. Running on Vercel without Turso → /tmp/library.db (writable, ephemeral)
//   3. Local dev → data/library.db next to the project root
//
// On Vercel the project root is read-only; only /tmp is writable.
// VERCEL env var is automatically set to '1' in all Vercel environments.

function resolveDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL)   return '/tmp';
  return path.join(__dirname, '..', 'data');
}

function makeClient() {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({
      url:       process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  const dataDir = resolveDataDir();
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  } catch {
    // /tmp always exists; ignore mkdir errors
  }

  return createClient({ url: `file:${path.join(dataDir, 'library.db')}` });
}

// Attempt to create the client; if anything goes wrong (e.g. native bindings
// unavailable in the Lambda environment) set client to null and let the route
// handlers return graceful empty responses rather than crashing the process.
let client = null;
try {
  client = makeClient();
} catch (err) {
  console.error('[db] Failed to create database client:', err);
}

// ── Schema ────────────────────────────────────────────────────────────────────

async function initSchema() {
  if (!client) return; // No client — skip silently
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

async function syncAuthors() {
  if (!client) return;

  const { rows: qualified } = await client.execute({
    sql:  `SELECT author AS name FROM books WHERE author != ''
           GROUP BY lower(author) HAVING COUNT(*) >= ?`,
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

  await client.execute({
    sql:  `DELETE FROM authors
           WHERE is_manual = 0
             AND lower(name) NOT IN (
               SELECT lower(author) FROM books WHERE author != ''
               GROUP BY lower(author) HAVING COUNT(*) >= ?
             )`,
    args: [MIN_BOOKS_FOR_FAVORITE_AUTHOR],
  });
}

async function getFavoriteAuthors() {
  if (!client) return [];
  const { rows } = await client.execute(`
    SELECT a.id, a.name, COUNT(b.id) AS book_count
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

/** True when running without a configured database (Vercel without Turso). */
const isDbAvailable = () => client !== null;

module.exports = {
  client,
  isDbAvailable,
  initSchema,
  syncAuthors,
  getFavoriteAuthors,
  bookToApi,
  randomUUID,
  MIN_BOOKS_FOR_FAVORITE_AUTHOR,
};
