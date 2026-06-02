export interface GoogleBook {
  id:          string;
  title:       string;
  authors:     string[];
  coverUrl:    string | null;
  isbn:        string | null;
  publishYear: number | null;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseGoogleItem(item: Record<string, unknown>): GoogleBook | null {
  const info = item?.volumeInfo as Record<string, unknown> | undefined;
  if (!info?.title) return null;

  const ids = (info.industryIdentifiers as { type: string; identifier: string }[] | undefined) ?? [];
  const isbn =
    ids.find(i => i.type === 'ISBN_13')?.identifier ??
    ids.find(i => i.type === 'ISBN_10')?.identifier ??
    null;

  const rawCover = (info.imageLinks as Record<string, string> | undefined)?.thumbnail ?? null;
  const pubDate  = String(info.publishedDate ?? '');
  const year     = pubDate ? parseInt(pubDate.slice(0, 4), 10) || null : null;

  return {
    id:          String(item.id ?? ''),
    title:       String(info.title),
    authors:     (info.authors as string[] | undefined) ?? [],
    coverUrl:    rawCover ? rawCover.replace('http:', 'https:') : null,
    isbn,
    publishYear: year,
  };
}

async function queryGoogle(q: string, max = 3): Promise<GoogleBook[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=${max}&printType=books`
    );
    if (!res.ok) return [];
    const data = await res.json() as { items?: Record<string, unknown>[] };
    return (data.items ?? []).map(parseGoogleItem).filter((b): b is GoogleBook => b !== null);
  } catch {
    return [];
  }
}

// ── Open Library fallback ─────────────────────────────────────────────────────

async function queryOpenLibrary(title: string, author: string): Promise<GoogleBook[]> {
  try {
    const p = new URLSearchParams({ limit: '3', fields: 'key,title,author_name,first_publish_year,cover_i' });
    if (title.trim())  p.set('title',  title.trim());
    if (author.trim()) p.set('author', author.trim());
    const res = await fetch(`https://openlibrary.org/search.json?${p}`);
    if (!res.ok) return [];
    const data = await res.json() as { docs?: Record<string, unknown>[] };
    return (data.docs ?? [])
      .slice(0, 3)
      .map(doc => ({
        id:          String(doc.key ?? Math.random()),
        title:       String(doc.title ?? ''),
        authors:     (doc.author_name as string[] | undefined) ?? [],
        coverUrl:    doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : null,
        isbn:        null,
        publishYear: typeof doc.first_publish_year === 'number' ? doc.first_publish_year : null,
      }))
      .filter(b => b.title);
  } catch {
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search by title and/or author using the structured intitle:/inauthor: operators.
 * Falls back to Open Library if Google Books returns nothing.
 */
export async function searchByTitleAuthor(
  title: string,
  author: string,
): Promise<GoogleBook[]> {
  const parts: string[] = [];
  if (title.trim())  parts.push(`intitle:${encodeURIComponent(title.trim())}`);
  if (author.trim()) parts.push(`inauthor:${encodeURIComponent(author.trim())}`);
  if (parts.length === 0) return [];

  const results = await queryGoogle(parts.join('+'));
  if (results.length > 0) return results;

  // Google Books returned nothing — try Open Library
  return queryOpenLibrary(title, author);
}

/** Free-text search (used by the manual Google Books lookup link). */
export async function searchByText(query: string): Promise<GoogleBook[]> {
  return queryGoogle(encodeURIComponent(query), 8);
}
