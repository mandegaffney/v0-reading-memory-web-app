'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Middleware ─────────────────────────────────────────────────────────────────

// In production the frontend is served from the same origin, so CORS is only
// needed for local dev where Next.js runs on :3000 and Express on :3001.
// (Next.js rewrites proxy /api/* in dev, so the browser never sees CORS — but
// adding the header costs nothing.)
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'],
}));

app.use(express.json({ limit: '10mb' }));

// ── API routes ─────────────────────────────────────────────────────────────────

app.use('/api/library', require('./routes/library'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/import',  require('./routes/import'));

// ── Static frontend (production only) ─────────────────────────────────────────
// In development, the Next.js dev server handles the frontend.
// In production (Railway), `npm run build` generates `out/` via Next.js static
// export and this Express server serves everything from that folder.

if (process.env.NODE_ENV === 'production') {
  const outDir = path.join(__dirname, '..', 'out');

  app.use(express.static(outDir));

  // Fallback: for any non-asset route not matched above, serve the closest
  // pre-rendered HTML (directory index), or root index.html as last resort.
  app.get('*', (req, res) => {
    const dirIndex = path.join(outDir, req.path, 'index.html');
    if (fs.existsSync(dirIndex)) return res.sendFile(dirIndex);
    res.sendFile(path.join(outDir, 'index.html'));
  });
}

// ── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const env = process.env.NODE_ENV ?? 'development';
  console.log(`\n🚀 Reading Memory API — ${env} — port ${PORT}\n`);
});
