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
