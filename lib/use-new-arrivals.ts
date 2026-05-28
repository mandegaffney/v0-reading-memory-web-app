'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ImportedBook } from './preferences';
import { ladybirdSearchUrl } from './use-author-books';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ArrivalBook {
  key: string;
  title: string;
  authorName: string;
  publishYear: number | null;
  coverUrl: string | null;
  buyUrl: string;
  matchReason: 'both' | 'author' | 'genre';
}

// ── Module-level session cache ─────────────────────────────────────────────────
// Cleared only on full page refresh.  Keyed so a new CSV import triggers a refetch.

interface CacheEntry {
  arrivals: ArrivalBook[];
  fetchedAt: Date;
  key: string;
}
let _sessionCache: CacheEntry | null = null;

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR   = new Date().getFullYear();
const PUBLISHED_IN   = `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`; // e.g. "2025-2026"
const MIN_PUB_YEAR   = 2020;
const MAX_PUB_YEAR   = CURRENT_YEAR + 2; // tolerate near-future pub dates in OL data

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeText(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract the user's top genres from their imported library, ordered by frequency.
 * Genre strings from CSVs are often comma- or slash-separated (e.g. "Thriller/Mystery").
 */
export function extractUserGenres(books: Pick<ImportedBook, 'genre'>[]): string[] {
  const freq = new Map<string, number>();
  for (const { genre } of books) {
    if (!genre) continue;
    for (const part of genre.split(/[,/|&]+/).map(g => g.trim()).filter(Boolean)) {
      const key = normalizeText(part);
      if (key.length > 2) freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);
}

async function fetchOL(
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<Record<string, unknown>[]> {
  try {
    const q = new URLSearchParams({
      limit: '15',
      ...params,
      fields: 'key,title,author_name,publish_year,first_publish_year,cover_i,subject',
    });
    const res = await fetch(`https://openlibrary.org/search.json?${q}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs as Record<string, unknown>[]) ?? [];
  } catch {
    return [];
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useNewArrivals(
  importedBooks: ImportedBook[],
  authorNames: string[],
  ownedTitlesSet: Set<string>,
): {
  arrivals: ArrivalBook[];
  isLoading: boolean;
  error: string | null;
  updatedAt: Date | null;
} {
  // Extract genres from the user's library (memoised on genre strings)
  const userGenres = useMemo(
    () => extractUserGenres(importedBooks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [importedBooks.map(b => b.genre).join('|')],
  );

  // Stable string key — changes when user context changes meaningfully.
  // Used to invalidate the session cache after a new CSV import.
  const stableKey = useMemo(
    () =>
      `${userGenres.slice(0, 3).join(',')}|${authorNames.slice(0, 6).sort().join(',')}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userGenres.join(','), authorNames.slice(0, 6).sort().join(',')],
  );

  const cachedMatch = _sessionCache?.key === stableKey ? _sessionCache : null;

  const [arrivals, setArrivals]   = useState<ArrivalBook[]>(cachedMatch?.arrivals ?? []);
  const [isLoading, setIsLoading] = useState(!cachedMatch);
  const [error, setError]         = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(cachedMatch?.fetchedAt ?? null);

  useEffect(() => {
    // ── Cache hit ───────────────────────────────────────────────────────────
    if (_sessionCache?.key === stableKey) {
      setArrivals(_sessionCache.arrivals);
      setUpdatedAt(_sessionCache.fetchedAt);
      setIsLoading(false);
      setError(null);
      return;
    }

    // ── No user context yet ─────────────────────────────────────────────────
    if (userGenres.length === 0 && authorNames.length === 0) {
      setIsLoading(false);
      return;
    }

    // ── Fetch ───────────────────────────────────────────────────────────────
    const controller = new AbortController();
    const sig = controller.signal;
    setIsLoading(true);
    setError(null);

    (async () => {
      const topGenres  = userGenres.slice(0, 3);
      const topAuthors = authorNames.slice(0, 6);

      const [genreResults, authorResults] = await Promise.all([
        Promise.all(
          topGenres.map(genre =>
            fetchOL(
              { subject: genre, sort: 'new', published_in: PUBLISHED_IN },
              sig,
            ),
          ),
        ),
        Promise.all(
          topAuthors.map(author =>
            fetchOL(
              { author, sort: 'new', published_in: PUBLISHED_IN, limit: '10' },
              sig,
            ),
          ),
        ),
      ]);

      if (sig.aborted) return;

      const authorNamesLower = new Set(authorNames.map(a => a.toLowerCase()));
      const seenKeys         = new Set<string>();
      const scored: Array<{ book: ArrivalBook; score: number }> = [];

      function processDoc(doc: Record<string, unknown>, contextGenre?: string) {
        const key = (doc.key as string) ?? '';
        if (!key || seenKeys.has(key)) return;
        seenKeys.add(key);

        const title = ((doc.title as string) ?? '').trim();
        if (!title) return;
        if (ownedTitlesSet.has(normalizeText(title))) return;

        // Sanitise publish year — Open Library has occasional data errors like "2098"
        const rawYears    = (doc.publish_year as number[]) ??
          (doc.first_publish_year ? [doc.first_publish_year as number] : []);
        const validYears  = rawYears.filter(y => y >= MIN_PUB_YEAR && y <= MAX_PUB_YEAR);
        const maxYear     = validYears.length ? Math.max(...validYears) : null;
        if (maxYear !== null && maxYear < MIN_PUB_YEAR) return;

        const authorName = ((doc.author_name as string[])?.[0] ?? '').trim();
        const coverId    = (doc.cover_i as number) ?? null;
        const subjects   = ((doc.subject as string[]) ?? []).map(normalizeText);

        // Determine relevance
        const authorMatch = authorNamesLower.has(authorName.toLowerCase());
        const genreMatch  =
          contextGenre !== undefined ||
          userGenres.some(g => subjects.some(s => s.includes(g) || g.includes(s)));

        if (!authorMatch && !genreMatch) return;

        const matchReason: ArrivalBook['matchReason'] =
          authorMatch && genreMatch ? 'both' :
          authorMatch               ? 'author' :
          'genre';
        const score = matchReason === 'both' ? 3 : matchReason === 'author' ? 2 : 1;

        scored.push({
          score,
          book: {
            key,
            title,
            authorName,
            publishYear: maxYear,
            coverUrl: coverId
              ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
              : null,
            buyUrl: ladybirdSearchUrl(title, authorName),
            matchReason,
          },
        });
      }

      // Genre-based results
      topGenres.forEach((genre, i) => {
        for (const doc of genreResults[i]) processDoc(doc, genre);
      });
      // Author-based results
      for (const docs of authorResults) {
        for (const doc of docs) processDoc(doc);
      }

      // Sort: score desc → publishYear desc
      scored.sort(
        (a, b) =>
          b.score - a.score ||
          (b.book.publishYear ?? 0) - (a.book.publishYear ?? 0),
      );

      const result    = scored.slice(0, 20).map(s => s.book);
      const fetchedAt = new Date();

      _sessionCache = { arrivals: result, fetchedAt, key: stableKey };

      setArrivals(result);
      setUpdatedAt(fetchedAt);
      setIsLoading(false);
    })().catch(() => {
      if (!controller.signal.aborted) {
        setError('Unable to load new arrivals. Try refreshing the page.');
        setIsLoading(false);
      }
    });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  return { arrivals, isLoading, error, updatedAt };
}
