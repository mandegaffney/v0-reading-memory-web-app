'use strict';

const { Router }                                = require('express');
const { client, isDbAvailable, syncAuthors, bookToApi, randomUUID } = require('../db');

const router = Router();

// GET /api/library — return all books, newest first
router.get('/', async (_req, res) => {
  if (!isDbAvailable()) return res.json({ books: [] });
  try {
    const { rows } = await client.execute(
      'SELECT * FROM books ORDER BY created_at DESC'
    );
    res.json({ books: rows.map(bookToApi) });
  } catch (err) {
    console.error('GET /api/library:', err);
    res.status(500).json({ error: 'Failed to fetch library.' });
  }
});

// POST /api/library — add a single book (source: "manual")
router.post('/', async (req, res) => {
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
  if (!isDbAvailable()) return res.status(503).json({ error: 'Database not configured.' });

  try {
    const id = randomUUID();
    await client.execute({
      sql: `INSERT INTO books
              (id, title, author, genre, date_ordered, unit_price,
               total_amount, order_status, order_id, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
      args: [
        id,
        String(title).trim(),
        String(author).trim(),
        String(genre).trim(),
        String(dateOrdered).trim(),
        String(unitPrice).trim(),
        String(totalAmount).trim(),
        String(orderStatus).trim(),
        String(orderId).trim(),
      ],
    });

    await syncAuthors();

    const { rows } = await client.execute({
      sql:  'SELECT * FROM books WHERE id = ?',
      args: [id],
    });
    res.status(201).json({ book: bookToApi(rows[0]) });
  } catch (err) {
    console.error('POST /api/library:', err);
    res.status(500).json({ error: 'Failed to add book.' });
  }
});

// DELETE /api/library/:id — remove a book
router.delete('/:id', async (req, res) => {
  if (!isDbAvailable()) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const result = await client.execute({
      sql:  'DELETE FROM books WHERE id = ?',
      args: [req.params.id],
    });
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }
    await syncAuthors();
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error('DELETE /api/library/:id:', err);
    res.status(500).json({ error: 'Failed to delete book.' });
  }
});

module.exports = router;
