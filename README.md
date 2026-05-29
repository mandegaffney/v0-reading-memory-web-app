# Reading Memory

Track your hardcover book collection, discover new arrivals matched to your taste, and never buy a duplicate again.

**Stack:** Next.js 16 · Express · SQLite (better-sqlite3) · Tailwind CSS · shadcn/ui

---

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Install all dependencies (frontend + backend)
npm install

# 2. Start both servers concurrently
npm run dev
```

`npm run dev` runs:
- **Next.js** on `http://localhost:3000` (frontend)
- **Express** on `http://localhost:3001` (API)

All `/api/*` requests from the Next.js dev server are automatically proxied to Express — no browser CORS issues.

The SQLite database is created automatically at `data/library.db` on first run.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/library` | Return all books |
| `POST` | `/api/library` | Add a single book (`source: "manual"`) |
| `DELETE` | `/api/library/:id` | Remove a book by ID |
| `GET` | `/api/authors` | Return all favorite authors (≥ 2 books) |
| `POST` | `/api/authors` | Manually add or un-hide an author |
| `DELETE` | `/api/authors/:id` | Hide an author from the favorites list |
| `POST` | `/api/import` | Bulk-replace all `source: "csv"` books |

**Data rules:**
- Books with `source: "manual"` are never deleted by `/api/import`
- The Favorite Authors list is re-evaluated after every import or book change
- An author needs ≥ 2 books in the library to appear in Favorite Authors

---

## Production Build

```bash
# Build the Next.js static export
npm run build

# Start the Express server (serves API + static frontend)
NODE_ENV=production npm start
```

The production server runs on `PORT` (default `3001`).

---

## Deploy to Railway

1. Create a new Railway project and link this repository.
2. Railway will detect the `railway.toml` config and use it automatically.
3. Set the following environment variables in the Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `DATA_DIR` | `/app/data` |
   | `CORS_ORIGIN` | `https://your-app.up.railway.app` |

4. **Add a Railway Volume** for SQLite persistence:
   - Go to your service → **Volumes** → **Add Volume**
   - Mount path: `/app/data`
   - Without a volume the database resets on every deploy.

5. Deploy. Railway runs `npm install && npm run build` then `npm start`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port the Express server listens on |
| `NODE_ENV` | `development` | Set to `production` for Railway |
| `DATA_DIR` | `./data` | Directory where `library.db` is stored |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
