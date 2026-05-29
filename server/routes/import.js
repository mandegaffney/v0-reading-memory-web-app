'use strict';

const { Router }                               = require('express');
const { randomUUID }                           = require('crypto');
const { db, syncAuthors, getFavoriteAuthors }  = require('../db');

const router = Router();

/**
 * POST /api/import
 *
 * Accepts a JSON payload { books: ImportedBook[] } and bulk-replaces
 * all books with source = "csv".  Books with source = "manual" are
 * never touched.
 *
 * Body: { books: Array<{ title, author?, genre?, dateOrdered?,
 *                        unitPrice?, totalAmount?, orderStatus?, orderId? }> }
 *
 * Response: { imported: number, authors: FavoriteAuthor[] }
 */
router.post('/', (req, res) => {
  const { books } = req.body ?? {};

  if (!Array.isArray(books)) {
    return res.status(400).json({ error: '"books" must be an array.' });
  }

  // Only keep rows that have a non-empty title
  const valid = books.filter(
    b => typeof b?.title === 'string' && b.title.trim().length > 0
  );

  try {
    const runImport = db.transaction(() => {
      // 1. Remove all previously-imported CSV books
      db.prepare(`DELETE FROM books WHERE source = 'csv'`).run();

      // 2. Insert the new batch
      const insert = db.prepare(`
        INSERT INTO books
          (id, title, author, genre, date_ordered, unit_price, total_amount, order_status, order_id, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'csv')
      `);

      for (const b of valid) {
        insert.run(
          randomUUID(),
          b.title.trim(),
          (b.author       ?? '').trim(),
          (b.genre        ?? '').trim(),
          (b.dateOrdered  ?? '').trim(),
          (b.unitPrice    ?? '').trim(),
          (b.totalAmount  ?? '').trim(),
          (b.orderStatus  ?? '').trim(),
          (b.orderId      ?? '').trim(),
        );
      }

      // 3. Re-evaluate the Favorite Authors list
      syncAuthors();
    });

    runImport();

    res.json({
      imported: valid.length,
      authors:  getFavoriteAuthors(),
    });
  } catch (err) {
    console.error('POST /api/import error:', err);
    // Transaction rolled back — existing data untouched
    res.status(500).json({ error: 'Import failed. Your existing library was not modified.' });
  }
});

module.exports = router;
