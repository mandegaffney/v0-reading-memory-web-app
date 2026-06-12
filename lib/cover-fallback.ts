'use client';

/**
 * Fetches a book cover thumbnail from the Google Books API — used as a
 * fallback when Open Library has no cover_i for a title.
 */
export async function fetchGoogleBooksCover(
  title: string,
  author: string,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const q = encodeURIComponent(`intitle:${title}${author ? ` inauthor:${author}` : ''}`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const thumb = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail as string | undefined;
    return thumb ? thumb.replace('http://', 'https://') : null;
  } catch {
    return null;
  }
}

/**
 * Fetches a book cover from Open Library's search index — used as the
 * primary source since it requires no API key and isn't rate-limited.
 */
export async function fetchOpenLibraryCover(
  title: string,
  author: string,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({ title, fields: 'cover_i', limit: '1' });
    if (author) params.set('author', author);
    const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const coverId = data.docs?.[0]?.cover_i as number | undefined;
    return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
  } catch {
    return null;
  }
}

/**
 * Fetches a book cover, trying Open Library first and falling back to
 * Google Books if no cover is found there.
 */
export async function fetchBookCover(
  title: string,
  author: string,
  signal: AbortSignal,
): Promise<string | null> {
  const fromOpenLibrary = await fetchOpenLibraryCover(title, author, signal);
  if (fromOpenLibrary) return fromOpenLibrary;
  return fetchGoogleBooksCover(title, author, signal);
}

/**
 * Fetches an author photo from Wikipedia — used as a fallback when Open
 * Library has no author photo for a name.
 */
export async function fetchWikipediaAuthorPhoto(
  name: string,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      { signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.thumbnail?.source as string | undefined) ?? null;
  } catch {
    return null;
  }
}
