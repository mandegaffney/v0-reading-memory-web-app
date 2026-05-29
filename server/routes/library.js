'use strict';

const { Router }                     = require('express');
const { randomUUID }                 = require('crypto');
const { db, syncAuthors, bookToApi } = require('../db');

const router = Router();

// GET /api/library — return all books, newest first
router.get('/', (_req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM books ORDER BY created_at DESC`).all();
    res.json({ books: rows.map(bookToApi) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch library.' });
  }
});

// POST /api/library — add a single book (source: "manual")
router.post('/', (req, res) => {
  const {
    title        = '',
    author       = '',
    genre        = '',
    dateOrdered  = '',
    unitPrice    = '',
    totalAmount  = '',
    orderStatus  = '',
    orderId      = '',
  } = req.body ?? {};

  if (!String(title).trim()) {
    return res.status(400).json({ error: 'title is required.' });
  }

  try {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO books
        (id, title, author, genre, date_ordered, unit_price, total_amount, order_status, order_id, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
    `).run(
      id,
      String(title).trim(),
      String(author).trim(),
      String(genre).trim(),
      String(dateOrdered).trim(),
      String(unitPrice).trim(),
      String(totalAmount).trim(),
      String(orderStatus).trim(),
      String(orderId).trim(),
    );

    syncAuthors();

    const row = db.prepare(`SELECT * FROM books WHERE id = ?`).get(id);
    res.status(201).json({ book: bookToApi(row) });
  } catch (err) {
    console.error('POST /api/library error:', err);
    res.status(500).json({ error: 'Failed to add book.' });
  }
});

// DELETE /api/library/:id — remove a book
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(`DELETE FROM books WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }
    syncAuthors();
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error('DELETE /api/library/:id error:', err);
    res.status(500).json({ error: 'Failed to delete book.' });
  }
});

module.exports = router;
