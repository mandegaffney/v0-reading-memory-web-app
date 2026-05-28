'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ImportedBook {
  title: string;
  author: string;
  genre: string;
  dateOrdered: string;
  unitPrice: string;
  totalAmount: string;
  orderStatus: string;
  orderId: string;
}

interface Preferences {
  // Persisted to localStorage
  dislikedBookIds: string[];
  dislikedAuthorIds: string[];
  dislikeBook: (id: string) => void;
  unDislikeBook: (id: string) => void;
  dislikeAuthor: (id: string) => void;
  unDislikeAuthor: (id: string) => void;
  isBookDisliked: (id: string) => boolean;
  isAuthorDisliked: (id: string) => boolean;

  // In-memory only (session-scoped, not persisted)
  importedBooks: ImportedBook[];
  importedAuthorNames: string[];
  // Replaces the entire in-memory library with the new CSV data
  replaceImportedBooks: (books: ImportedBook[]) => { newBooks: number; newAuthors: number };
  clearImportedBooks: () => void;
  isBookImported: (title: string) => boolean;
}

const PreferencesContext = createContext<Preferences | null>(null);

const STORAGE_KEY = 'reading-memory-prefs';

interface StoredPrefs {
  dislikedBookIds: string[];
  dislikedAuthorIds: string[];
}

function load(): StoredPrefs {
  if (typeof window === 'undefined') return { dislikedBookIds: [], dislikedAuthorIds: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dislikedBookIds: [], dislikedAuthorIds: [] };
    return JSON.parse(raw);
  } catch {
    return { dislikedBookIds: [], dislikedAuthorIds: [] };
  }
}

function normalizeTitle(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // --- Persisted --- user-configured — preserved across imports, do not overwrite on import
  const [dislikedBookIds, setDislikedBookIds] = useState<string[]>([]);
  const [dislikedAuthorIds, setDislikedAuthorIds] = useState<string[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const stored = load();
    setDislikedBookIds(stored.dislikedBookIds);
    setDislikedAuthorIds(stored.dislikedAuthorIds);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dislikedBookIds, dislikedAuthorIds }));
    } catch {}
  }, [dislikedBookIds, dislikedAuthorIds]);

  const dislikeBook    = (id: string) => setDislikedBookIds(p => p.includes(id) ? p : [...p, id]);
  const unDislikeBook  = (id: string) => setDislikedBookIds(p => p.filter(i => i !== id));
  const dislikeAuthor  = (id: string) => setDislikedAuthorIds(p => p.includes(id) ? p : [...p, id]);
  const unDislikeAuthor = (id: string) => setDislikedAuthorIds(p => p.filter(i => i !== id));
  const isBookDisliked  = (id: string) => dislikedBookIds.includes(id);
  const isAuthorDisliked = (id: string) => dislikedAuthorIds.includes(id);

  // --- In-memory only ---
  const [importedBooks, setImportedBooks] = useState<ImportedBook[]>([]);
  const [importedAuthorNames, setImportedAuthorNames] = useState<string[]>([]);

  /**
   * Completely replaces the in-memory library with the incoming CSV data.
   * Every component that consumes importedBooks / importedAuthorNames will
   * re-render automatically because both are React state.
   */
  const replaceImportedBooks = (incoming: ImportedBook[]): { newBooks: number; newAuthors: number } => {
    const validBooks = incoming.filter(b => b.title.trim().length > 0);
    const uniqueAuthors = [
      ...new Set(validBooks.map(b => b.author.trim()).filter(a => a.length > 0)),
    ];
    setImportedBooks(validBooks);
    setImportedAuthorNames(uniqueAuthors);
    return { newBooks: validBooks.length, newAuthors: uniqueAuthors.length };
  };

  const clearImportedBooks = () => {
    setImportedBooks([]);
    setImportedAuthorNames([]);
  };

  const isBookImported = (title: string) =>
    importedBooks.some(b => normalizeTitle(b.title) === normalizeTitle(title));

  return (
    <PreferencesContext.Provider value={{
      dislikedBookIds, dislikedAuthorIds,
      dislikeBook, unDislikeBook, dislikeAuthor, unDislikeAuthor,
      isBookDisliked, isAuthorDisliked,
      importedBooks, importedAuthorNames,
      replaceImportedBooks, clearImportedBooks, isBookImported,
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
