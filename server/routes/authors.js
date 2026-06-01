'use strict';

const { Router }                             = require('express');
const { client, isDbAvailable, getFavoriteAuthors, randomUUID } = require('../db');

const router = Router();

// GET /api/authors — all visible favorite authors with book counts
router.get('/', async (_req, res) => {
  if (!isDbAvailable()) return res.json({ authors: [] });
  try {
    res.json({ authors: await getFavoriteAuthors() });
  } catch (err) {
    console.error('GET /api/authors:', err);
    res.status(500).json({ error: 'Failed to fetch authors.' });
  }
});

// POST /api/authors — manually add or un-hide an author
router.post('/', async (req, res) => {
  const { name } = req.body ?? {};
  if (!String(name ?? '').trim()) {
    return res.status(400).json({ error: 'name is required.' });
  }

  const trimmed = String(name).trim();
  if (!isDbAvailable()) return res.status(503).json({ error: 'Database not configured.' });

  try {
    const { rows } = await client.execute({
      sql:  'SELECT id, is_hidden FROM authors WHERE lower(name) = lower(?)',
      args: [trimmed],
    });

    if (rows.length > 0) {
      // Already exists — un-hide and mark as manual so it persists
      await client.execute({
        sql:  'UPDATE authors SET is_hidden = 0, is_manual = 1 WHERE id = ?',
        args: [String(rows[0].id)],
      });
    } else {
      await client.execute({
        sql:  'INSERT INTO authors (id, name, is_hidden, is_manual) VALUES (?, ?, 0, 1)',
        args: [randomUUID(), trimmed],
      });
    }

    res.status(201).json({ authors: await getFavoriteAuthors() });
  } catch (err) {
    console.error('POST /api/authors:', err);
    res.status(500).json({ error: 'Failed to add author.' });
  }
});

// DELETE /api/authors/:id — hide an author from the favorites list
router.delete('/:id', async (req, res) => {
  if (!isDbAvailable()) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const result = await client.execute({
      sql:  'UPDATE authors SET is_hidden = 1 WHERE id = ?',
      args: [req.params.id],
    });
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Author not found.' });
    }
    res.json({ authors: await getFavoriteAuthors() });
  } catch (err) {
    console.error('DELETE /api/authors/:id:', err);
    res.status(500).json({ error: 'Failed to remove author.' });
  }
});

module.exports = router;
