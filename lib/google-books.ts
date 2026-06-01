export interface GoogleBook {
  id:       string;
  title:    string;
  authors:  string[];
  coverUrl: string | null;
  isbn:     string | null;
}

function parseItem(item: Record<string, unknown>): GoogleBook | null {
  const info = item?.volumeInfo as Record<string, unknown> | undefined;
  if (!info?.title) return null;

  const ids = (info.industryIdentifiers as { type: string; identifier: string }[] | undefined) ?? [];
  const isbn =
    ids.find(i => i.type === 'ISBN_13')?.identifier ??
    ids.find(i => i.type === 'ISBN_10')?.identifier ??
    null;

  const rawCover = (info.imageLinks as Record<string, string> | undefined)?.thumbnail ?? null;

  return {
    id:       String(item.id ?? ''),
    title:    String(info.title),
    authors:  (info.authors as string[] | undefined) ?? [],
    coverUrl: rawCover ? rawCover.replace('http:', 'https:') : null,
    isbn,
  };
}

async function queryGoogleBooks(params: string, maxResults = 5): Promise<GoogleBook[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?${params}&maxResults=${maxResults}&printType=books`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as { items?: Record<string, unknown>[] };
    return (data.items ?? []).map(parseItem).filter((b): b is GoogleBook => b !== null);
  } catch {
    return [];
  }
}

/** Look up a book by ISBN (from a barcode scan). */
export async function searchByISBN(isbn: string): Promise<GoogleBook | null> {
  const results = await queryGoogleBooks(`q=isbn:${isbn}`, 1);
  return results[0] ?? null;
}

/** Search by free text (title extracted from OCR, or manual query). */
export async function searchByText(query: string): Promise<GoogleBook[]> {
  return queryGoogleBooks(`q=${encodeURIComponent(query)}`, 8);
}
