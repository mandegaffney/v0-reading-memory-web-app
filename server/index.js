'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { initSchema, initDB } = require('./db');

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(cors({
  origin:  process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json({ limit: '10mb' }));

// ── Lazy schema init ──────────────────────────────────────────────────────────
// Vercel cold starts: runs CREATE TABLE IF NOT EXISTS on first request.
// Local dev: initDB() is called at startup instead (see bottom of file).

let _schemaReady   = false;
let _schemaPromise = null;

app.use(async (_req, _res, next) => {
  if (_schemaReady) return next();
  if (!_schemaPromise) {
    _schemaPromise = initSchema().catch(err => {
      _schemaPromise = null; // allow retry on next request
      throw err;
    });
  }
  try {
    await _schemaPromise;
    _schemaReady = true;
    next();
  } catch (err) {
    console.error('[db] Schema init failed:', err.message);
    next(err);
  }
});

// ── API routes ─────────────────────────────────────────────────────────────────

app.use('/api/library', require('./routes/library'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/import',  require('./routes/import'));
app.use('/api/hidden',  require('./routes/hidden'));

// ── Static frontend (Railway / self-hosted only) ───────────────────────────────
// On Vercel the Next.js build is served natively — no static serving needed.

if (process.env.SERVE_STATIC === 'true') {
  const outDir = path.join(__dirname, '..', 'out');
  app.use(express.static(outDir));
  app.get('*', (_req, res) => {
    const dirIndex = path.join(outDir, _req.path, 'index.html');
    res.sendFile(fs.existsSync(dirIndex) ? dirIndex : path.join(outDir, 'index.html'));
  });
}

// ── Error handler ──────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Export for Vercel (serverless) ────────────────────────────────────────────

module.exports = app;

// ── Local dev: also listen on a port ──────────────────────────────────────────

if (require.main === module) {
  initDB()
    .then(() => {
      _schemaReady = true; // skip lazy init on first request
      app.listen(PORT, () => {
        console.log(`\n🚀 Reading Memory API — port ${PORT}\n`);
      });
    })
    .catch(err => {
      // DB unavailable — still start the server; routes degrade gracefully
      console.error('[db] Startup warning:', err.message);
      app.listen(PORT, () => {
        console.log(`\n🚀 Reading Memory API — port ${PORT} (DB unavailable)\n`);
      });
    });
}
