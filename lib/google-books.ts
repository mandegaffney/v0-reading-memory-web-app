export interface GoogleBook {
  id:          string;
  title:       string;
  authors:     string[];
  coverUrl:    string | null;
  isbn:        string | null;
  publishYear: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Merge two result lists, deduplicating by normalized title. Primary wins. */
function mergeResults(primary: GoogleBook[], secondary: GoogleBook[]): GoogleBook[] {
  const seen = new Set<string>();
  const out: GoogleBook[] = [];
  for (const book of [...primary, ...secondary]) {
    const key = normalizeTitle(book.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(book);
  }
  return out;
}

// ── Google Books ──────────────────────────────────────────────────────────────

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

async function queryGoogle(q: string, max = 40): Promise<GoogleBook[]> {
  try {
    // Google Books caps at 40 per request; fetch two pages if we want more
    const page1 = fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=40&startIndex=0&printType=books`
    );
    const page2 = max > 40
      ? fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=40&startIndex=40&printType=books`)
      : Promise.resolve(null);

    const [r1, r2] = await Promise.all([page1, page2]);
    const d1 = r1.ok ? await r1.json() as { items?: Record<string, unknown>[] } : { items: [] };
    const d2 = r2?.ok ? await r2.json() as { items?: Record<string, unknown>[] } : { items: [] };

    return [...(d1.items ?? []), ...(d2.items ?? [])]
      .map(parseGoogleItem)
      .filter((b): b is GoogleBook => b !== null);
  } catch {
    return [];
  }
}

// ── Open Library ──────────────────────────────────────────────────────────────

function parseOLDoc(doc: Record<string, unknown>): GoogleBook | null {
  const title = String(doc.title ?? '').trim();
  if (!title) return null;
  return {
    id:          `ol:${String(doc.key ?? Math.random())}`,
    title,
    authors:     (doc.author_name as string[] | undefined) ?? [],
    coverUrl:    typeof doc.cover_i === 'number'
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    isbn:        null,
    publishYear: typeof doc.first_publish_year === 'number' ? doc.first_publish_year : null,
  };
}

async function queryOpenLibrary(
  params: Record<string, string>,
  limit = 100,
): Promise<GoogleBook[]> {
  try {
    const p = new URLSearchParams({
      ...params,
      limit:  String(limit),
      sort:   'new',
      fields: 'key,title,author_name,first_publish_year,cover_i',
    });
    const res = await fetch(`https://openlibrary.org/search.json?${p}`);
    if (!res.ok) return [];
    const data = await res.json() as { docs?: Record<string, unknown>[] };
    return (data.docs ?? []).map(parseOLDoc).filter((b): b is GoogleBook => b !== null);
  } catch {
    return [];
  }
}

// ── Public search functions ───────────────────────────────────────────────────

/**
 * Comprehensive search combining Google Books + Open Library.
 * Returns up to ~100 deduplicated results, newest first.
 */
export async function searchByTitleAuthor(
  title:  string,
  author: string,
): Promise<GoogleBook[]> {
  const gParts: string[] = [];
  if (title.trim())  gParts.push(`intitle:${encodeURIComponent(title.trim())}`);
  if (author.trim()) gParts.push(`inauthor:${encodeURIComponent(author.trim())}`);

  const olParams: Record<string, string> = {};
  if (title.trim())  olParams.title  = title.trim();
  if (author.trim()) olParams.author = author.trim();

  const [googleResults, olResults] = await Promise.all([
    gParts.length > 0 ? queryGoogle(gParts.join('+'), 80) : Promise.resolve([]),
    Object.keys(olParams).length > 0 ? queryOpenLibrary(olParams, 100) : Promise.resolve([]),
  ]);

  return mergeResults(googleResults, olResults);
}

/** Free-text fallback (used internally). */
export async function searchByText(query: string): Promise<GoogleBook[]> {
  const [g, ol] = await Promise.all([
    queryGoogle(encodeURIComponent(query), 40),
    queryOpenLibrary({ q: query }, 50),
  ]);
  return mergeResults(g, ol);
}
