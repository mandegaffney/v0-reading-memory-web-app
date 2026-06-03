'use client';

import { useState, useEffect } from 'react';

export interface DiscoveryBook {
  key: string;         // Open Library work key, e.g. /works/OL123W
  title: string;
  authorName: string;
  publishYear: number | null;
  coverUrl: string | null;
  buyUrl: string;      // Ladybird Books deep-search URL
}

interface UseAuthorBooksResult {
  booksYouMightLike: DiscoveryBook[];
  preOrders: DiscoveryBook[];
  isLoading: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Builds a Ladybird Books search URL using the Bookmanager platform's native
 * keyword search route: /browse/filter/k/keyword/t/{title} {author}
 *
 * Confirmed by inspecting the Bookmanager JS bundle — the platform builds its
 * own internal links as:
 *   "/browse/filter/k/keyword/t/" + title + " " + author
 *
 * The previous /search?q= path returns 404; /?s= returns the SPA shell without
 * triggering a search. This path returns 200 and routes to real results.
 */
export function ladybirdSearchUrl(title: string, author: string): string {
  const term = encodeURIComponent(`${title} ${author}`.trim());
  return `https://www.ladybirdbooks.org/browse/filter/k/keyword/t/${term}`;
}

const CURRENT_YEAR = new Date().getFullYear();

async function fetchForAuthor(
  authorName: string,
  signal: AbortSignal
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    author: authorName,
    sort: 'new',
    limit: '20',
    fields: 'key,title,author_name,first_publish_year,publish_year,cover_i',
  });
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`,
      { signal }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs as Record<string, unknown>[]) ?? [];
  } catch {
    // Network error or abort — silently skip this author
    return [];
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthorBooks(
  authorNames: string[],
  ownedTitlesSet: Set<string>,
  hiddenTitles: Set<string> = new Set(),
  hiddenAuthors: Set<string> = new Set(),
): UseAuthorBooksResult {
  const [booksYouMightLike, setBooksYouMightLike] = useState<DiscoveryBook[]>([]);
  const [preOrders, setPreOrders]                 = useState<DiscoveryBook[]>([]);
  const [isLoading, setIsLoading]                 = useState(false);

  // Stable string keys so the effect only re-fires when values actually change
  const authorsKey = authorNames.slice().sort().join('\n');
  const ownedKey   = [...ownedTitlesSet].sort().join('\n');

  useEffect(() => {
    if (authorNames.length === 0) {
      setBooksYouMightLike([]);
      setPreOrders([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setBooksYouMightLike([]);
    setPreOrders([]);

    (async () => {
      const allDocs = await Promise.all(
        authorNames.map(name => fetchForAuthor(name, controller.signal))
      );

      if (controller.signal.aborted) return;

      const seenKeys  = new Set<string>();
      const likes: DiscoveryBook[]  = [];
      const preOs: DiscoveryBook[]  = [];

      for (const docs of allDocs) {
        for (const doc of docs) {
          const key = (doc.key as string) ?? '';
          if (!key || seenKeys.has(key)) continue;
          seenKeys.add(key);

          const title = ((doc.title as string) ?? '').trim();
          if (!title) continue;

          // Skip books the user already owns
          if (ownedTitlesSet.has(normalizeTitle(title))) continue;

          const authorName    = ((doc.author_name as string[])?.[0] ?? '').trim();
          const publishYears  = (doc.publish_year  as number[])  ?? (doc.first_publish_year ? [doc.first_publish_year as number] : []);
          const maxYear       = publishYears.length ? Math.max(...publishYears) : null;
          const coverId       = (doc.cover_i as number) ?? null;

          const book: DiscoveryBook = {
            key,
            title,
            authorName,
            publishYear: maxYear,
            coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
            buyUrl: ladybirdSearchUrl(title, authorName),
          };

          // Pre-order bucket: published in current year or later
          if (maxYear !== null && maxYear >= CURRENT_YEAR) {
            preOs.push(book);
          } else {
            likes.push(book);
          }
        }
      }

      setBooksYouMightLike(likes.slice(0, 20));
      setPreOrders(preOs.slice(0, 10));
      setIsLoading(false);
    })().catch(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorsKey, ownedKey]);

  // Filter hidden items without busting the fetch cache
  const filteredPreOrders = preOrders.filter(b => {
    if (hiddenTitles.has(normalizeTitle(b.title))) return false;
    if (b.authorName && hiddenAuthors.has(b.authorName.toLowerCase())) return false;
    return true;
  });

  return { booksYouMightLike, preOrders: filteredPreOrders, isLoading };
}
