'use client';

import { useState, useEffect } from 'react';
import { fetchWikipediaAuthorPhoto, fetchWikidataAuthorPhoto } from './cover-fallback';

/** Fetches one author OLID from the Open Library author-search endpoint. */
async function fetchOlid(
  authorName: string,
  signal: AbortSignal
): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q: authorName, limit: '1', fields: 'key,name' });
    const res = await fetch(
      `https://openlibrary.org/search/authors.json?${params}`,
      { signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // key is the bare OLID, e.g. "OL23919A" (no /authors/ prefix)
    const olid = (data.docs as { key?: string }[])?.[0]?.key;
    return olid ?? null;
  } catch {
    return null;
  }
}

/**
 * Given a list of author names, returns a Map<name, photoUrl | null>.
 * Photo URL format: https://covers.openlibrary.org/a/olid/{OLID}-M.jpg
 * Falls back to null if the author is not found or the request fails.
 */
export function useAuthorPhotos(authorNames: string[]): {
  photos: Map<string, string | null>;
  isLoading: boolean;
} {
  const [photos, setPhotos]     = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const key = authorNames.slice().sort().join('\n');

  useEffect(() => {
    if (authorNames.length === 0) {
      setPhotos(new Map());
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    (async () => {
      const pairs = await Promise.all(
        authorNames.map(async name => {
          const olid = await fetchOlid(name, controller.signal);
          let url = olid
            ? `https://covers.openlibrary.org/a/olid/${olid}-M.jpg`
            : null;

          // Fall back to Wikipedia's author photo when Open Library has none
          if (!url) {
            url = await fetchWikipediaAuthorPhoto(name, controller.signal);
          }

          // Final fallback: Wikidata's image claim, resolved via Wikimedia Commons
          if (!url) {
            url = await fetchWikidataAuthorPhoto(name, controller.signal);
          }

          return [name, url] as [string, string | null];
        })
      );

      if (controller.signal.aborted) return;

      setPhotos(new Map(pairs));
      setIsLoading(false);
    })().catch(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { photos, isLoading };
}
