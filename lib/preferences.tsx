'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum books by the same author required to appear in Favorite Authors. */
export const MIN_BOOKS_FOR_FAVORITE_AUTHOR = 2;

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReadingStatus = 'to-read' | 'reading' | 'finished';

export interface ImportedBook {
  id?:            string;   // present when returned from the API
  title:          string;
  author:         string;
  genre:          string;
  dateOrdered:    string;
  unitPrice:      string;
  totalAmount:    string;
  orderStatus:    string;
  orderId:        string;
  source?:        'csv' | 'manual';
  readingStatus?: ReadingStatus;
}

/** An author who qualifies for the Favorite Authors list (≥ MIN_BOOKS_FOR_FAVORITE_AUTHOR). */
export interface ImportedFavoriteAuthor {
  id:        string;
  name:      string;
  bookCount: number;
}

/** A book suppressed from all recommendation surfaces. */
export interface HiddenBook {
  id:    string;
  title: string;
  isbn:  string | null;
}

/** An author suppressed from all recommendation surfaces and Favorite Authors. */
export interface HiddenAuthor {
  id:   string;
  name: string;
}

interface Preferences {
  // ── Persisted to localStorage ────────────────────────────────────────────
  dislikedBookIds:   string[];
  dislikedAuthorIds: string[];
  dislikeBook:       (id: string) => void;
  unDislikeBook:     (id: string) => void;
  dislikeAuthor:     (id: string) => void;
  unDislikeAuthor:   (id: string) => void;
  isBookDisliked:    (id: string) => boolean;
  isAuthorDisliked:  (id: string) => boolean;

  // ── API-backed library state ──────────────────────────────────────────────
  /** True while the initial GET /api/library + GET /api/authors fetch is in flight. */
  isLoading:   boolean;
  /** Non-null if the initial fetch fails entirely. */
  loadError:   string | null;

  importedBooks:           ImportedBook[];
  /** All unique author names from the library (used for discovery queries). */
  importedAuthorNames:     string[];
  /** Authors with ≥ MIN_BOOKS_FOR_FAVORITE_AUTHOR books, sorted by count desc. */
  importedFavoriteAuthors: ImportedFavoriteAuthor[];

  /**
   * POST /api/import — bulk-replace CSV books.
   * Resolves with { newBooks, newAuthors } on success.
   * Rejects with an Error on API failure (existing data left intact by the server).
   */
  replaceImportedBooks: (books: ImportedBook[]) => Promise<{ newBooks: number; newAuthors: number }>;

  /**
   * POST /api/import with an empty array — removes all CSV books from the server.
   */
  clearImportedBooks: () => Promise<void>;

  /**
   * POST /api/library — add a single manually-scanned or entered book.
   * Never overwritten by a CSV import (source: "manual").
   */
  addBook: (book: Omit<ImportedBook, 'id' | 'source'>) => Promise<void>;

  /**
   * DELETE /api/library/:id — permanently remove a book.
   */
  removeBook: (id: string) => Promise<void>;

  /**
   * PATCH /api/library/:id — update a book's reading status.
   */
  updateReadingStatus: (id: string, status: ReadingStatus) => Promise<void>;

  // ── Recommendation suppression (Turso-backed) ─────────────────────────────
  hiddenBooks:   HiddenBook[];
  hiddenAuthors: HiddenAuthor[];
  hideBook:      (title: string, isbn?: string | null) => Promise<void>;
  unhideBook:    (id: string) => Promise<void>;
  hideAuthor:    (name: string) => Promise<void>;
  unhideAuthor:  (id: string) => Promise<void>;

  isBookImported: (title: string) => boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const PreferencesContext = createContext<Preferences | null>(null);

// ── localStorage for disliked IDs only ───────────────────────────────────────

const STORAGE_KEY = 'reading-memory-prefs';

interface StoredPrefs {
  dislikedBookIds:   string[];
  dislikedAuthorIds: string[];
}

function loadStored(): StoredPrefs {
  if (typeof window === 'undefined') return { dislikedBookIds: [], dislikedAuthorIds: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dislikedBookIds: [], dislikedAuthorIds: [] };
    return JSON.parse(raw);
  } catch {
    return { dislikedBookIds: [], dislikedAuthorIds: [] };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeTitle(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Derive unique author names from a book list (for discovery queries). */
function extractAuthorNames(books: ImportedBook[]): string[] {
  return [...new Set(books.map(b => b.author).filter(Boolean))];
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PreferencesProvider({ children }: { children: ReactNode }) {

  // ── Persisted dislike lists ────────────────────────────────────────────────
  const [dislikedBookIds,   setDislikedBookIds]   = useState<string[]>([]);
  const [dislikedAuthorIds, setDislikedAuthorIds] = useState<string[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const stored = loadStored();
    setDislikedBookIds(stored.dislikedBookIds);
    setDislikedAuthorIds(stored.dislikedAuthorIds);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dislikedBookIds, dislikedAuthorIds }));
    } catch {}
  }, [dislikedBookIds, dislikedAuthorIds]);

  const dislikeBook     = (id: string) => setDislikedBookIds(p  => p.includes(id) ? p : [...p, id]);
  const unDislikeBook   = (id: string) => setDislikedBookIds(p  => p.filter(i => i !== id));
  const dislikeAuthor   = (id: string) => setDislikedAuthorIds(p => p.includes(id) ? p : [...p, id]);
  const unDislikeAuthor = (id: string) => setDislikedAuthorIds(p => p.filter(i => i !== id));
  const isBookDisliked  = (id: string) => dislikedBookIds.includes(id);
  const isAuthorDisliked = (id: string) => dislikedAuthorIds.includes(id);

  // ── API-backed library state ───────────────────────────────────────────────
  const [importedBooks,           setImportedBooks]           = useState<ImportedBook[]>([]);
  const [importedAuthorNames,     setImportedAuthorNames]     = useState<string[]>([]);
  const [importedFavoriteAuthors, setImportedFavoriteAuthors] = useState<ImportedFavoriteAuthor[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);

  // ── Hidden state (Turso-backed) ──────────────────────────────────────────
  const [hiddenBooks,   setHiddenBooks]   = useState<HiddenBook[]>([]);
  const [hiddenAuthors, setHiddenAuthors] = useState<HiddenAuthor[]>([]);

  /**
   * Fetch the current library state from the API and hydrate React state.
   * Called on mount and after every mutation (import, clear, add, delete).
   */
  const hydrateFromAPI = useCallback(async () => {
    try {
      const [booksRes, authorsRes, hiddenBooksRes, hiddenAuthorsRes] = await Promise.all([
        fetch('/api/library'),
        fetch('/api/authors'),
        fetch('/api/hidden/books'),
        fetch('/api/hidden/authors'),
      ]);

      if (!booksRes.ok || !authorsRes.ok) {
        throw new Error('Server returned an error. Please refresh the page.');
      }

      const { books }:   { books: ImportedBook[] }           = await booksRes.json();
      const { authors }: { authors: ImportedFavoriteAuthor[] } = await authorsRes.json();

      setImportedBooks(books);
      setImportedAuthorNames(extractAuthorNames(books));
      setImportedFavoriteAuthors(authors);

      if (hiddenBooksRes.ok) {
        const { books: hb }: { books: HiddenBook[] } = await hiddenBooksRes.json();
        setHiddenBooks(hb);
      }
      if (hiddenAuthorsRes.ok) {
        const { authors: ha }: { authors: HiddenAuthor[] } = await hiddenAuthorsRes.json();
        setHiddenAuthors(ha);
      }

      setLoadError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to the server.';
      setLoadError(msg);
    }
  }, []);

  // Initial load
  useEffect(() => {
    hydrateFromAPI().finally(() => setIsLoading(false));
  }, [hydrateFromAPI]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * POST /api/import — bulk-replace CSV books then re-hydrate state.
   */
  const replaceImportedBooks = async (
    incoming: ImportedBook[]
  ): Promise<{ newBooks: number; newAuthors: number }> => {
    const res = await fetch('/api/import', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ books: incoming }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Import failed. Please try again.');
    }

    const data: { imported: number; authors: ImportedFavoriteAuthor[] } = await res.json();
    await hydrateFromAPI();
    return { newBooks: data.imported, newAuthors: data.authors.length };
  };

  /**
   * POST /api/import with an empty array — clears all CSV books.
   */
  const clearImportedBooks = async (): Promise<void> => {
    const res = await fetch('/api/import', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ books: [] }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Failed to clear library.');
    }

    await hydrateFromAPI();
  };

  /**
   * POST /api/library — save a manually scanned/entered book (source: "manual").
   */
  const addBook = async (book: Omit<ImportedBook, 'id' | 'source'>): Promise<void> => {
    const res = await fetch('/api/library', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(book),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Failed to add book.');
    }
    await hydrateFromAPI();
  };

  const removeBook = async (id: string): Promise<void> => {
    const res = await fetch(`/api/library/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Failed to remove book.');
    }
    await hydrateFromAPI();
  };

  const updateReadingStatus = async (id: string, status: ReadingStatus): Promise<void> => {
    const res = await fetch(`/api/library/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ readingStatus: status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Failed to update reading status.');
    }
    setImportedBooks(prev => prev.map(b => b.id === id ? { ...b, readingStatus: status } : b));
  };

  // ── Recommendation suppression ────────────────────────────────────────────

  async function hideBook(title: string, isbn?: string | null): Promise<void> {
    const res = await fetch('/api/hidden/books', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, isbn: isbn ?? null }),
    });
    if (!res.ok) throw new Error('Failed to hide book.');
    const { book }: { book: HiddenBook } = await res.json();
    setHiddenBooks(prev => prev.some(b => b.id === book.id) ? prev : [...prev, book]);
  }

  async function unhideBook(id: string): Promise<void> {
    const res = await fetch(`/api/hidden/books/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to unhide book.');
    setHiddenBooks(prev => prev.filter(b => b.id !== id));
  }

  async function hideAuthor(name: string): Promise<void> {
    const res = await fetch('/api/hidden/authors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to hide author.');
    const { author }: { author: HiddenAuthor } = await res.json();
    setHiddenAuthors(prev => prev.some(a => a.id === author.id) ? prev : [...prev, author]);
    // Also remove from Favorite Authors immediately
    setImportedFavoriteAuthors(prev => prev.filter(a => a.name.toLowerCase() !== name.toLowerCase()));
  }

  async function unhideAuthor(id: string): Promise<void> {
    const res = await fetch(`/api/hidden/authors/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to unhide author.');
    setHiddenAuthors(prev => prev.filter(a => a.id !== id));
    // Re-hydrate so the author re-appears in Favorite Authors if they qualify
    await hydrateFromAPI();
  }

  const isBookImported = (title: string) =>
    importedBooks.some(b => normalizeTitle(b.title) === normalizeTitle(title));

  // ── Context value ──────────────────────────────────────────────────────────

  return (
    <PreferencesContext.Provider value={{
      dislikedBookIds, dislikedAuthorIds,
      dislikeBook, unDislikeBook, dislikeAuthor, unDislikeAuthor,
      isBookDisliked, isAuthorDisliked,
      isLoading, loadError,
      importedBooks, importedAuthorNames, importedFavoriteAuthors,
      replaceImportedBooks, clearImportedBooks, addBook, removeBook, updateReadingStatus,
      hiddenBooks, hiddenAuthors, hideBook, unhideBook, hideAuthor, unhideAuthor,
      isBookImported,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be inside PreferencesProvider');
  return ctx;
}
