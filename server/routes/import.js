'use strict';

const { Router }                                      = require('express');
const { client, isDbAvailable, syncAuthors, getFavoriteAuthors, randomUUID } = require('../db');

const router = Router();

/**
 * POST /api/import
 *
 * Bulk-replaces all books with source = "csv".
 * Manual books (source = "manual") are never touched.
 * Runs as an atomic batch so the library is never left in a partial state.
 *
 * Body:   { books: Array<{ title, author?, genre?, dateOrdered?,
 *                          unitPrice?, totalAmount?, orderStatus?, orderId? }> }
 * Response: { imported: number, authors: FavoriteAuthor[] }
 */
router.post('/', async (req, res) => {
  const { books } = req.body ?? {};

  if (!Array.isArray(books)) {
    return res.status(400).json({ error: '"books" must be an array.' });
  }

  const valid = books.filter(
    b => typeof b?.title === 'string' && b.title.trim().length > 0,
  );

  if (!isDbAvailable()) {
    return res.status(503).json({ error: 'Database not configured. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to your Vercel environment variables.' });
  }

  try {
    // Preserve reading status across re-imports by matching on title
    const { rows: existingCsv } = await client.execute(
      "SELECT title, reading_status FROM books WHERE source = 'csv'"
    );
    const statusByTitle = new Map(
      existingCsv.map(row => [String(row.title).trim().toLowerCase(), String(row.reading_status)])
    );

    // Delete old CSV books + insert the new batch atomically
    const stmts = [
      { sql: "DELETE FROM books WHERE source = 'csv'" },
      ...valid.map(b => ({
        sql: `INSERT INTO books
                (id, title, author, genre, date_ordered, unit_price,
                 total_amount, order_status, order_id, source, reading_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'csv', ?)`,
        args: [
          randomUUID(),
          b.title.trim(),
          (b.author       ?? '').trim(),
          (b.genre        ?? '').trim(),
          (b.dateOrdered  ?? '').trim(),
          (b.unitPrice    ?? '').trim(),
          (b.totalAmount  ?? '').trim(),
          (b.orderStatus  ?? '').trim(),
          (b.orderId      ?? '').trim(),
          statusByTitle.get(b.title.trim().toLowerCase()) ?? 'to-read',
        ],
      })),
    ];

    await client.batch(stmts, 'write');
    console.log(`[import] ✓ Wrote ${valid.length} books to database`);

    // Re-evaluate the Favorite Authors list after the import
    await syncAuthors();

    res.json({
      imported: valid.length,
      authors:  await getFavoriteAuthors(),
    });
  } catch (err) {
    console.error('POST /api/import:', err);
    // Batch rolled back — existing data untouched
    res.status(500).json({
      error: 'Import failed. Your existing library was not modified.',
    });
  }
});

module.exports = router;
