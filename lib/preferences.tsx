'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface Preferences {
  dislikedBookIds: string[];
  dislikedAuthorIds: string[];
  dislikeBook: (id: string) => void;
  unDislikeBook: (id: string) => void;
  dislikeAuthor: (id: string) => void;
  unDislikeAuthor: (id: string) => void;
  isBookDisliked: (id: string) => boolean;
  isAuthorDisliked: (id: string) => boolean;
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

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [dislikedBookIds, setDislikedBookIds] = useState<string[]>([]);
  const [dislikedAuthorIds, setDislikedAuthorIds] = useState<string[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const stored = load();
    setDislikedBookIds(stored.dislikedBookIds);
    setDislikedAuthorIds(stored.dislikedAuthorIds);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dislikedBookIds, dislikedAuthorIds }));
    } catch {}
  }, [dislikedBookIds, dislikedAuthorIds]);

  const dislikeBook = (id: string) =>
    setDislikedBookIds(prev => prev.includes(id) ? prev : [...prev, id]);

  const unDislikeBook = (id: string) =>
    setDislikedBookIds(prev => prev.filter(i => i !== id));

  const dislikeAuthor = (id: string) =>
    setDislikedAuthorIds(prev => prev.includes(id) ? prev : [...prev, id]);

  const unDislikeAuthor = (id: string) =>
    setDislikedAuthorIds(prev => prev.filter(i => i !== id));

  const isBookDisliked = (id: string) => dislikedBookIds.includes(id);
  const isAuthorDisliked = (id: string) => dislikedAuthorIds.includes(id);

  return (
    <PreferencesContext.Provider value={{
      dislikedBookIds,
      dislikedAuthorIds,
      dislikeBook,
      unDislikeBook,
      dislikeAuthor,
      unDislikeAuthor,
      isBookDisliked,
      isAuthorDisliked,
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
