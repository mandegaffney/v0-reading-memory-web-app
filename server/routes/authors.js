'use strict';

const { Router }                  = require('express');
const { randomUUID }              = require('crypto');
const { db, getFavoriteAuthors }  = require('../db');

const router = Router();

// GET /api/authors — all visible favorite authors with book counts
router.get('/', (_req, res) => {
  try {
    res.json({ authors: getFavoriteAuthors() });
  } catch {
    res.status(500).json({ error: 'Failed to fetch authors.' });
  }
});

// POST /api/authors — manually add an author (bypasses 2-book rule)
// Also un-hides an author if they were previously removed.
router.post('/', (req, res) => {
  const { name } = req.body ?? {};
  if (!String(name ?? '').trim()) {
    return res.status(400).json({ error: 'name is required.' });
  }

  const trimmed = String(name).trim();

  try {
    const existing = db
      .prepare(`SELECT id, is_hidden FROM authors WHERE lower(name) = lower(?)`)
      .get(trimmed);

    if (existing) {
      // Un-hide if previously removed; mark as manual so it persists
      db.prepare(`UPDATE authors SET is_hidden = 0, is_manual = 1 WHERE id = ?`)
        .run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO authors (id, name, is_hidden, is_manual) VALUES (?, ?, 0, 1)
      `).run(randomUUID(), trimmed);
    }

    res.status(201).json({ authors: getFavoriteAuthors() });
  } catch (err) {
    console.error('POST /api/authors error:', err);
    res.status(500).json({ error: 'Failed to add author.' });
  }
});

// DELETE /api/authors/:id — hide an author from the favorites list
router.delete('/:id', (req, res) => {
  try {
    const result = db
      .prepare(`UPDATE authors SET is_hidden = 1 WHERE id = ?`)
      .run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Author not found.' });
    }

    res.json({ authors: getFavoriteAuthors() });
  } catch (err) {
    console.error('DELETE /api/authors/:id error:', err);
    res.status(500).json({ error: 'Failed to remove author.' });
  }
});

module.exports = router;
