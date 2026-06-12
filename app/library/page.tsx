'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BookCard } from '@/components/book-card';
import { usePreferences } from '@/lib/preferences';
import type { ReadingStatus } from '@/lib/preferences';
import { getOwnedBooks } from '@/lib/data';
import { Search, X, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<ReadingStatus, string> = {
  'to-read': 'Want to read',
  reading:   'Reading',
  finished:  'Finished',
};

const STATUS_COLORS: Record<ReadingStatus, string> = {
  'to-read': '#8A8475',
  reading:   '#9C5B3F',
  finished:  '#8A8475',
};

// ── Inner component that reads search params ──────────────────────────────────

function LibraryContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { dislikedBookIds, importedBooks, removeBook, updateReadingStatus } = usePreferences();

  const authorFromUrl = searchParams.get('author') ?? '';
  const [query, setQuery] = useState(authorFromUrl);

  // Sync URL param → local query whenever the URL changes
  useEffect(() => {
    setQuery(authorFromUrl);
  }, [authorFromUrl]);

  const hasImport   = importedBooks.length > 0;
  const staticOwned = getOwnedBooks(dislikedBookIds);

  const q = query.trim().toLowerCase();

  const filteredImported = hasImport
    ? (q
        ? importedBooks.filter(
            b =>
              b.title.toLowerCase().includes(q) ||
              b.author.toLowerCase().includes(q) ||
              b.genre.toLowerCase().includes(q) ||
              b.orderStatus.toLowerCase().includes(q) ||
              b.orderId.toLowerCase().includes(q)
          )
        : importedBooks)
    : [];

  const filteredStatic = !hasImport
    ? (q
        ? staticOwned.filter(
            b =>
              b.title.toLowerCase().includes(q) ||
              b.authorName.toLowerCase().includes(q)
          )
        : staticOwned)
    : [];

  const hasResults = hasImport ? filteredImported.length > 0 : filteredStatic.length > 0;

  const clearFilter = () => {
    setQuery('');
    router.replace('/library');
  };

  // ── Remove a book ──────────────────────────────────────────────────────────
  // Two-step: first click shows a Sonner confirmation toast; the "Remove" action
  // inside the toast actually calls the API. The toast auto-dismisses in 6s if
  // the user does nothing, leaving the book in place.
  function confirmRemove(book: { id?: string; title: string }) {
    if (!book.id) {
      toast.error('This book cannot be removed — no ID found.');
      return;
    }
    const id = book.id;
    toast(`Remove "${book.title.length > 45 ? book.title.slice(0, 45) + '…' : book.title}"?`, {
      action: {
        label: 'Remove',
        onClick: async () => {
          try {
            await removeBook(id);
            toast.success('Book removed from your library.');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to remove book.');
          }
        },
      },
      cancel: { label: 'Keep', onClick: () => {} },
      duration: 6000,
    });
  }

  // ── Reading status ────────────────────────────────────────────────────────
  async function handleStatusChange(book: { id?: string }, status: ReadingStatus) {
    if (!book.id) return;
    try {
      await updateReadingStatus(book.id, status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      {/* ════════════ HEADER — editorial title, matches "Your stack" ════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-10 md:pt-16 pb-8">
        <span
          className="text-[12.5px] tracking-[0.5px]"
          style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}
        >
          (your library)
        </span>
        <h1
          className="m-0 mt-3 font-normal leading-[0.98] tracking-[-0.01em] text-balance"
          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(40px, 6vw, 72px)' }}
        >
          {authorFromUrl ? (
            <>Results for <span className="italic">{authorFromUrl}</span></>
          ) : (
            <>Your <span className="italic">stack</span>, in full</>
          )}
        </h1>
      </div>

      <main className="max-w-[1280px] mx-auto px-6 md:px-12 pb-20">

        {/* Search + active filter ────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-10 max-w-sm">
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#A39B8B' }} />
            <input
              type="text"
              placeholder={hasImport ? 'Search title, author, genre, status…' : 'Search by title or author'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-6 pr-6 py-2 text-[13px] bg-transparent border-0 border-b-[1.5px] focus:outline-none focus:border-[#9C5B3F] transition-colors placeholder:text-[#A39B8B]"
              style={{ fontFamily: 'var(--font-space-mono), monospace', borderColor: '#E0D9C8', color: '#2B2926' }}
            />
            {query && (
              <button
                onClick={clearFilter}
                className="absolute right-0 top-1/2 -translate-y-1/2 transition-colors hover:text-[#9C5B3F]"
                style={{ color: '#A39B8B' }}
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Author-filter badge — shown when navigated from an author card */}
          {authorFromUrl && (
            <div className="flex items-center gap-4 text-[12px]" style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}>
              <span className="inline-flex items-center gap-1.5">
                (filtering by author)
                <button
                  onClick={clearFilter}
                  className="transition-colors hover:text-[#9C5B3F]"
                  aria-label="Remove author filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
              <Link href="/library" className="underline underline-offset-4 transition-colors hover:text-[#9C5B3F]">
                view full library →
              </Link>
            </div>
          )}
        </div>

        {/* Results ────────────────────────────────────────────────── */}
        {!hasResults ? (
          <div className="py-16 text-center border-t" style={{ borderColor: '#E0D9C8' }}>
            {q ? (
              <div>
                <p className="text-sm" style={{ color: '#8A8475' }}>
                  No books found for &ldquo;{query}&rdquo;
                </p>
                <button
                  onClick={clearFilter}
                  className="mt-3 text-[12px] underline underline-offset-4 transition-colors hover:text-[#9C5B3F]"
                  style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
                >
                  (clear filter)
                </button>
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#8A8475' }}>
                Your library is empty.{' '}
                <Link href="/settings" className="underline underline-offset-4 transition-colors hover:text-[#9C5B3F]">
                  Import a CSV
                </Link>{' '}
                to get started.
              </p>
            )}
          </div>
        ) : hasImport ? (
          /* ── Imported data: editorial index list, like "Your stack" on the homepage ── */
          <div>
            {filteredImported.map((book, i) => {
              const status = book.readingStatus ?? 'to-read';
              const color  = STATUS_COLORS[status];
              return (
                <div
                  key={book.id ?? i}
                  className="group grid grid-cols-[28px_1fr_auto_24px] md:grid-cols-[44px_1fr_auto_28px] items-center gap-3 md:gap-[18px] py-5 px-2 md:px-1 border-t transition-colors hover:bg-[#F4EFE1]"
                  style={{ borderColor: '#E0D9C8' }}
                >
                  <span
                    className="text-[13px]"
                    style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#B3AB9A' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex flex-col gap-px">
                    <span
                      className="leading-[1.04] tracking-[-0.01em] truncate"
                      style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '22px' }}
                    >
                      {book.title}
                    </span>
                    <span className="text-[13.5px] truncate" style={{ color: '#8A8475' }}>
                      {book.author || '—'}
                    </span>
                  </div>
                  <div className="relative inline-block justify-self-end">
                    <select
                      value={status}
                      onChange={e => handleStatusChange(book, e.target.value as ReadingStatus)}
                      disabled={status === 'finished'}
                      className="appearance-none bg-transparent border-0 pl-0 pr-4 py-1 text-[10.5px] font-bold uppercase tracking-[0.6px] whitespace-nowrap focus:outline-none disabled:cursor-not-allowed"
                      style={{ fontFamily: 'var(--font-space-mono), monospace', color }}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {status !== 'finished' && (
                      <ChevronDown
                        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3"
                        style={{ color }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => confirmRemove(book)}
                    title="Remove book"
                    className="justify-self-end p-1 transition-colors hover:text-[#9C5B3F]"
                    style={{ color: '#A39B8B' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <div className="border-t" style={{ borderColor: '#E0D9C8' }} />
            {q && (
              <p className="text-[12px] mt-4" style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}>
                ({filteredImported.length} of {importedBooks.length} books)
              </p>
            )}
          </div>
        ) : (
          /* ── Static/demo data: book card grid ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-10 border-t" style={{ borderColor: '#E0D9C8' }}>
            {filteredStatic.map(book => (
              <BookCard key={book.id} book={book} showStatus={false} />
            ))}
          </div>
        )}
      </main>

      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
}

// ── Page shell with Suspense (required for useSearchParams) ──────────────────

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryContent />
    </Suspense>
  );
}
