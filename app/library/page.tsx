'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { BookCard } from '@/components/book-card';
import { usePreferences } from '@/lib/preferences';
import { getOwnedBooks } from '@/lib/data';
import { ArrowLeft, Search, BookOpen, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Inner component that reads search params ──────────────────────────────────

function LibraryContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { dislikedBookIds, importedBooks, removeBook } = usePreferences();

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

  const totalOwned = hasImport ? importedBooks.length : staticOwned.length;
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

  const pageTitle = authorFromUrl
    ? `Library — ${authorFromUrl}`
    : 'Your Library';

  const pageSubtitle = authorFromUrl
    ? `Showing results for "${authorFromUrl}"`
    : `${totalOwned} hardcover ${totalOwned === 1 ? 'book' : 'books'}${hasImport ? ' — imported from CSV' : ''}`;

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Page header */}
      <div className="border-b border-border mt-6">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-[0.95]">
            {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-3">{pageSubtitle}</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12">

        {/* Search + active filter ────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-10 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={hasImport ? 'Search title, author, genre, status…' : 'Search by title or author'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm border border-border rounded-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {query && (
              <button
                onClick={clearFilter}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Author-filter badge — shown when navigated from an author card */}
          {authorFromUrl && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 bg-muted border border-border rounded-full px-2.5 py-1">
                Filtering by author
                <button
                  onClick={clearFilter}
                  className="hover:text-foreground transition-colors"
                  aria-label="Remove author filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
              <Link href="/library" className="hover:text-foreground transition-colors underline underline-offset-4">
                View full library
              </Link>
            </div>
          )}
        </div>

        {/* Results ────────────────────────────────────────────────── */}
        {!hasResults ? (
          <div className="text-center py-16">
            {q ? (
              <div>
                <p className="text-muted-foreground">
                  No books found for &ldquo;{query}&rdquo;
                </p>
                <button
                  onClick={clearFilter}
                  className="mt-3 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Your library is empty.{' '}
                <Link href="/settings" className="underline underline-offset-4 hover:text-foreground transition-colors">
                  Import a CSV
                </Link>{' '}
                to get started.
              </p>
            )}
          </div>
        ) : hasImport ? (
          /* ── Imported data: full table ── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2.5 pr-4 font-medium text-muted-foreground">Title</th>
                  <th className="py-2.5 pr-4 font-medium text-muted-foreground hidden md:table-cell">Author</th>
                  <th className="py-2.5 pr-4 font-medium text-muted-foreground hidden lg:table-cell">Genre</th>
                  <th className="py-2.5 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="py-2.5 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Price</th>
                  <th className="py-2.5 pr-4 font-medium text-muted-foreground hidden xl:table-cell">Total</th>
                  <th className="py-2.5 pr-4 font-medium text-muted-foreground hidden md:table-cell">Status</th>
                  <th className="py-2.5 font-medium text-muted-foreground hidden xl:table-cell">Order ID</th>
                  <th className="py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredImported.map((book, i) => (
                  <tr key={i} className="group hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-9 bg-muted rounded-sm shrink-0 flex items-center justify-center group-hover:bg-muted/70 transition-colors">
                          <BookOpen className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="font-medium leading-snug line-clamp-2">{book.title}</span>
                      </div>
                      <div className="md:hidden mt-1 pl-10 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {book.author && <span>{book.author}</span>}
                        {book.dateOrdered && <span>{book.dateOrdered}</span>}
                        {book.unitPrice && <span>{book.unitPrice}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-muted-foreground hidden md:table-cell">{book.author || '—'}</td>
                    <td className="py-3.5 pr-4 text-muted-foreground hidden lg:table-cell">{book.genre || '—'}</td>
                    <td className="py-3.5 pr-4 text-muted-foreground hidden sm:table-cell whitespace-nowrap">{book.dateOrdered || '—'}</td>
                    <td className="py-3.5 pr-4 text-muted-foreground hidden sm:table-cell font-mono text-xs">{book.unitPrice || '—'}</td>
                    <td className="py-3.5 pr-4 text-muted-foreground hidden xl:table-cell font-mono text-xs">{book.totalAmount || '—'}</td>
                    <td className="py-3.5 pr-4 hidden md:table-cell">
                      {book.orderStatus ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                          {book.orderStatus}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 text-muted-foreground hidden xl:table-cell font-mono text-xs">{book.orderId || '—'}</td>
                    {/* Delete — always visible on mobile, revealed on hover on desktop */}
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => confirmRemove(book)}
                        title="Remove book"
                        className="p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 sm:opacity-100 hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {q && (
              <p className="text-xs text-muted-foreground mt-4">
                {filteredImported.length} of {importedBooks.length} books
              </p>
            )}
          </div>
        ) : (
          /* ── Static/demo data: book card grid ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredStatic.map(book => (
              <BookCard key={book.id} book={book} showStatus={false} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground">Reading Memory — Track your hardcover collection</p>
        </div>
      </footer>
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
