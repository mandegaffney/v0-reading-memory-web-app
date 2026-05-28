'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Section, BookGrid, EmptyState } from '@/components/layout';
import { BookCard } from '@/components/book-card';
import { DiscoveryCard, DiscoveryCardSkeleton } from '@/components/discovery-card';
import { AuthorAvatar } from '@/components/author-avatar';
import { usePreferences } from '@/lib/preferences';
import { useAuthorBooks } from '@/lib/use-author-books';
import { useNewArrivals } from '@/lib/use-new-arrivals';
import { useAuthorPhotos } from '@/lib/use-author-photos';
import { getFavoriteAuthors, getOwnedBooks } from '@/lib/data';
import { ArrowRight, BookOpen } from 'lucide-react';

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function HomePage() {
  const { dislikedBookIds, dislikedAuthorIds, importedBooks, importedAuthorNames, importedFavoriteAuthors, isLoading, loadError } = usePreferences();

  // ── Initial API load states ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-32 text-center">
          <p className="text-muted-foreground text-sm animate-pulse">Loading your library…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-32 text-center">
          <p className="text-destructive text-sm">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const favoriteAuthors = getFavoriteAuthors(dislikedAuthorIds);
  const ownedBooks      = getOwnedBooks(dislikedBookIds);

  const hasImport    = importedBooks.length > 0;
  const totalOwned   = hasImport ? importedBooks.length  : ownedBooks.length;
  // Stat reflects the qualified favorites list, not raw unique-author count
  const totalAuthors = hasImport ? importedFavoriteAuthors.length : favoriteAuthors.length;

  // Fetch Open Library photos for the top 6 favorite authors shown on the home page
  const importedAuthorsSlice = useMemo(
    () => (hasImport ? importedFavoriteAuthors.slice(0, 6).map(a => a.name) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasImport, importedFavoriteAuthors.map(a => a.name).join(',')]
  );
  const { photos: importedPhotos, isLoading: photosLoading } = useAuthorPhotos(importedAuthorsSlice);

  // Author names to query Open Library for book discovery
  const authorNamesToQuery = useMemo<string[]>(
    () => (hasImport ? importedAuthorNames : favoriteAuthors.map(a => a.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasImport, importedAuthorNames.join(','), dislikedAuthorIds.join(',')]
  );

  // Union of all titles the user already owns
  const ownedTitlesSet = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const b of ownedBooks)    s.add(normalizeTitle(b.title));
    for (const b of importedBooks) s.add(normalizeTitle(b.title));
    return s;
  }, [ownedBooks, importedBooks]);

  // Pre-orders — author-based Open Library query (separate loading state)
  const { preOrders, isLoading: isPreOrdersLoading } = useAuthorBooks(authorNamesToQuery, ownedTitlesSet);

  // "Books You Might Like" — new arrivals matched to the user's genres + authors
  const {
    arrivals,
    isLoading: isArrivalsLoading,
    error: arrivalsError,
    updatedAt,
  } = useNewArrivals(importedBooks, authorNamesToQuery, ownedTitlesSet);

  const recentImported = importedBooks.slice(0, 10);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero / Stats */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-tight">
              Your personal
              <br />
              <span className="text-muted-foreground">book collection</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 leading-relaxed">
              {totalOwned} hardcover {totalOwned === 1 ? 'book' : 'books'} from{' '}
              {totalAuthors} favorite {totalAuthors === 1 ? 'author' : 'authors'}.
              Never buy duplicates again.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 mt-12">
            <Stat value={totalOwned}        label="Books owned" />
            <Stat value={totalAuthors}      label="Favorite authors" />
            <Stat value={preOrders.length}  label="Pre-orders available" />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6">

        {/* ── Favorite Authors ──────────────────────────────── */}
        <Section
          title="Favorite Authors"
          subtitle={hasImport ? 'Authors with 2+ books in your library — click to browse' : 'Authors you read most — click to browse their books'}
          action={
            <Link
              href="/authors"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          {hasImport ? (
            importedFavoriteAuthors.length >= 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {importedFavoriteAuthors.slice(0, 6).map((author, i) => (
                  <Link
                    key={i}
                    href={`/library?author=${encodeURIComponent(author.name)}`}
                    className="group flex items-center gap-3 p-3 border border-border rounded-sm hover:bg-muted/50 hover:border-foreground/20 transition-colors"
                  >
                    <AuthorAvatar
                      name={author.name}
                      photoUrl={importedPhotos.get(author.name) ?? null}
                      isLoading={photosLoading}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif font-medium text-sm truncate group-hover:text-accent transition-colors">
                        {author.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No favorite authors yet"
                description="Read more books by the same author to build your favorites list."
              />
            )
          ) : favoriteAuthors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteAuthors.slice(0, 6).map((author) => (
                <Link
                  key={author.id}
                  href={`/library?author=${encodeURIComponent(author.name)}`}
                  className="group flex items-center gap-4 p-2 -mx-2 rounded-sm hover:bg-muted/40 transition-colors"
                >
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0">
                    <Image
                      src={author.imageUrl}
                      alt={author.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif font-medium truncate group-hover:text-accent transition-colors">
                      {author.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {author.booksOwned} {author.booksOwned === 1 ? 'book' : 'books'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No favorite authors"
              description="Authors you read most will appear here once your library is imported."
            />
          )}
        </Section>

        {/* ── Books You Might Like ──────────────────────────── */}
        <Section
          title="Books You Might Like"
          subtitle={
            updatedAt
              ? `Updated ${updatedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — new arrivals matched to your reading taste`
              : 'New arrivals matched to your reading taste — buy at Ladybird Books'
          }
          className="border-t border-border"
        >
          {isArrivalsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={i >= 4 ? 'hidden md:block' : ''}>
                  <DiscoveryCardSkeleton />
                </div>
              ))}
            </div>
          ) : arrivalsError ? (
            <EmptyState
              title="Couldn't load new arrivals"
              description={arrivalsError}
            />
          ) : arrivals.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {arrivals.slice(0, 8).map((book, i) => (
                <div key={book.key} className={i >= 4 ? 'hidden md:block' : ''}>
                  <DiscoveryCard book={book} badge="New This Week" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Check back soon"
              description="We'll match new Ladybird arrivals to your taste as they come in."
            />
          )}
        </Section>

        {/* ── Pre-Orders ────────────────────────────────────── */}
        {(isPreOrdersLoading || preOrders.length > 0) && (
          <Section
            title="Pre-Orders from Authors You Read"
            subtitle="Upcoming titles — reserve yours at Ladybird Books"
            className="border-t border-border"
          >
            {isPreOrdersLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={i >= 4 ? 'hidden md:block' : ''}>
                    <DiscoveryCardSkeleton />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {preOrders.slice(0, 8).map((book, i) => (
                  <div key={book.key} className={i >= 4 ? 'hidden md:block' : ''}>
                    <DiscoveryCard book={book} preOrder />
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Your Library preview ──────────────────────────── */}
        <Section
          title="Your Library"
          subtitle={hasImport ? 'Recently imported hardcovers' : 'Recently purchased hardcovers'}
          className="border-t border-border"
          action={
            <Link
              href="/library"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          {hasImport ? (
            <div className="divide-y divide-border">
              {recentImported.map((book, i) => (
                <div key={i} className="flex items-center gap-4 py-3.5">
                  <div className="w-8 h-10 bg-muted rounded-sm shrink-0 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{book.title}</p>
                    {book.author && (
                      <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {book.unitPrice && (
                      <span className="text-xs font-mono text-muted-foreground hidden sm:block">
                        {book.unitPrice}
                      </span>
                    )}
                    {book.dateOrdered && (
                      <span className="text-xs text-muted-foreground hidden md:block">
                        {book.dateOrdered}
                      </span>
                    )}
                    {book.orderStatus && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:block">
                        {book.orderStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {importedBooks.length > 10 && (
                <p className="text-xs text-muted-foreground pt-4">
                  Showing 10 of {importedBooks.length} —{' '}
                  <Link href="/library" className="underline underline-offset-4 hover:text-foreground transition-colors">
                    view all
                  </Link>
                </p>
              )}
            </div>
          ) : ownedBooks.length > 0 ? (
            <BookGrid columns={5}>
              {ownedBooks.slice(0, 10).map((book) => (
                <BookCard key={book.id} book={book} showStatus={false} />
              ))}
            </BookGrid>
          ) : (
            <EmptyState
              title="No books yet"
              description="Upload a CSV from your order history to get started."
              action={
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Import CSV
                </Link>
              }
            />
          )}
        </Section>

      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground">
            Reading Memory — Track your hardcover collection
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-3xl md:text-4xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
