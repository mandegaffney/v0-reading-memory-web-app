'use strict';

const { Router }                  = require('express');
const { client, syncAuthors, randomUUID } = require('../db');

const router = Router();

// ── Hidden books ──────────────────────────────────────────────────────────────

// GET /api/hidden/books
router.get('/books', async (_req, res) => {
  if (!client) return res.json({ books: [] });
  try {
    const { rows } = await client.execute('SELECT * FROM hidden_books ORDER BY created_at DESC');
    res.json({ books: rows.map(r => ({ id: String(r.id), title: String(r.title), isbn: r.isbn ? String(r.isbn) : null })) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch hidden books.' });
  }
});

// POST /api/hidden/books  { title, isbn? }
router.post('/books', async (req, res) => {
  const { title, isbn } = req.body ?? {};
  if (!String(title ?? '').trim()) return res.status(400).json({ error: 'title is required.' });

  if (!client) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const t = String(title).trim();
    // Idempotent — don't create a duplicate for the same title
    const { rows: existing } = await client.execute({
      sql:  'SELECT id FROM hidden_books WHERE lower(title) = lower(?)',
      args: [t],
    });
    if (existing.length > 0) {
      return res.json({ book: { id: String(existing[0].id), title: t, isbn: isbn?.trim() ?? null } });
    }
    const id = randomUUID();
    await client.execute({
      sql:  'INSERT INTO hidden_books (id, title, isbn) VALUES (?, ?, ?)',
      args: [id, t, String(isbn ?? '').trim() || null],
    });
    res.status(201).json({ book: { id, title: t, isbn: String(isbn ?? '').trim() || null } });
  } catch (err) {
    console.error('POST /api/hidden/books:', err);
    res.status(500).json({ error: 'Failed to hide book.' });
  }
});

// DELETE /api/hidden/books/:id
router.delete('/books/:id', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const result = await client.execute({
      sql:  'DELETE FROM hidden_books WHERE id = ?',
      args: [req.params.id],
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Hidden book not found.' });
    res.json({ deleted: req.params.id });
  } catch {
    res.status(500).json({ error: 'Failed to unhide book.' });
  }
});

// ── Hidden authors ────────────────────────────────────────────────────────────

// GET /api/hidden/authors
router.get('/authors', async (_req, res) => {
  if (!client) return res.json({ authors: [] });
  try {
    const { rows } = await client.execute('SELECT * FROM hidden_authors ORDER BY created_at DESC');
    res.json({ authors: rows.map(r => ({ id: String(r.id), name: String(r.name) })) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch hidden authors.' });
  }
});

// POST /api/hidden/authors  { name }
router.post('/authors', async (req, res) => {
  const { name } = req.body ?? {};
  if (!String(name ?? '').trim()) return res.status(400).json({ error: 'name is required.' });

  if (!client) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const n = String(name).trim();
    const { rows: existing } = await client.execute({
      sql:  'SELECT id FROM hidden_authors WHERE lower(name) = lower(?)',
      args: [n],
    });
    if (existing.length > 0) {
      return res.json({ author: { id: String(existing[0].id), name: n } });
    }
    const id = randomUUID();
    await client.execute({
      sql:  'INSERT INTO hidden_authors (id, name) VALUES (?, ?)',
      args: [id, n],
    });
    // Also hide this author in the Favorite Authors list
    await client.execute({
      sql:  'UPDATE authors SET is_hidden = 1 WHERE lower(name) = lower(?)',
      args: [n],
    });
    res.status(201).json({ author: { id, name: n } });
  } catch (err) {
    console.error('POST /api/hidden/authors:', err);
    res.status(500).json({ error: 'Failed to hide author.' });
  }
});

// DELETE /api/hidden/authors/:id
router.delete('/authors/:id', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'Database not configured.' });
  try {
    // Get the name before deleting so we can un-hide from Favorite Authors
    const { rows } = await client.execute({
      sql:  'SELECT name FROM hidden_authors WHERE id = ?',
      args: [req.params.id],
    });
    if (rows.length === 0) return res.status(404).json({ error: 'Hidden author not found.' });

    const name = String(rows[0].name);
    await client.execute({
      sql:  'DELETE FROM hidden_authors WHERE id = ?',
      args: [req.params.id],
    });
    // Re-evaluate whether the author qualifies for Favorite Authors (≥2 books rule)
    await syncAuthors();

    res.json({ deleted: req.params.id, name });
  } catch {
    res.status(500).json({ error: 'Failed to unhide author.' });
  }
});

module.exports = router;
