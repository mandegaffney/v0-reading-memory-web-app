'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Section, EmptyState } from '@/components/layout';
import { DiscoveryCard, DiscoveryCardSkeleton } from '@/components/discovery-card';
import { AuthorAvatar } from '@/components/author-avatar';
import { usePreferences } from '@/lib/preferences';
import { useAuthorBooks } from '@/lib/use-author-books';
import { useNewArrivals } from '@/lib/use-new-arrivals';
import { useAuthorPhotos } from '@/lib/use-author-photos';
import { getFavoriteAuthors, getOwnedBooks } from '@/lib/data';
import { ArrowRight, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function HomePage() {
  // ── All hooks must be called unconditionally before any early return ──────
  const {
    dislikedBookIds, dislikedAuthorIds,
    importedBooks, importedAuthorNames, importedFavoriteAuthors,
    hiddenBooks, hiddenAuthors, hideBook, hideAuthor,
    isLoading, loadError,
  } = usePreferences();

  const favoriteAuthors = getFavoriteAuthors(dislikedAuthorIds);
  const ownedBooks      = getOwnedBooks(dislikedBookIds);

  const hasImport    = importedBooks.length > 0;
  const totalOwned   = hasImport ? importedBooks.length  : ownedBooks.length;
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

  // Derived sets for filtering recommendations
  const hiddenTitlesSet = useMemo(
    () => new Set(hiddenBooks.map(b => b.title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hiddenBooks.map(b => b.title).join('|')]
  );
  const hiddenAuthorsSet = useMemo(
    () => new Set(hiddenAuthors.map(a => a.name.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hiddenAuthors.map(a => a.name).join('|')]
  );

  // Pre-orders — author-based Open Library query (separate loading state)
  const { preOrders, isLoading: isPreOrdersLoading } = useAuthorBooks(authorNamesToQuery, ownedTitlesSet, hiddenTitlesSet, hiddenAuthorsSet);

  // "Books You Might Like" — new arrivals matched to the user's genres + authors
  const {
    arrivals,
    isLoading: isArrivalsLoading,
    error: arrivalsError,
    updatedAt,
  } = useNewArrivals(importedBooks, authorNamesToQuery, ownedTitlesSet, hiddenTitlesSet, hiddenAuthorsSet);

  // ── Early returns after all hooks ─────────────────────────────────────
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

  // ── Hide helpers ──────────────────────────────────────────────────────────

  function confirmHideBook(
    title: string,
    isbn: string | null,
    doHide: (title: string, isbn?: string | null) => Promise<void>
  ) {
    toast(`Hide "${title.length > 40 ? title.slice(0, 40) + '…' : title}" from recommendations?`, {
      action: {
        label: 'Hide',
        onClick: async () => {
          try { await doHide(title, isbn); toast.success('Hidden from recommendations.'); }
          catch { toast.error('Failed to hide. Try again.'); }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
      duration: 6000,
    });
  }

  function confirmHideAuthor(name: string) {
    toast(`Hide all books by "${name}" from recommendations?`, {
      action: {
        label: 'Hide',
        onClick: async () => {
          try { await hideAuthor(name); toast.success(`${name} hidden from recommendations.`); }
          catch { toast.error('Failed to hide. Try again.'); }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
      duration: 6000,
    });
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

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero / Stats — layout per Hero.html design */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">

          {/* Headline: clamp(56px, 10vw, 150px), weight 500/400, line-height 0.92 */}
          <h1
            className="font-serif font-medium leading-[0.92] tracking-[-0.01em] text-balance"
            style={{ fontSize: 'clamp(56px, 10vw, 150px)' }}
          >
            Your personal
            <br />
            <em className="not-italic font-normal text-muted-foreground">book collection</em>
          </h1>

          {/* Stats — directly below headline (64px gap), no description in between */}
          <div
            className="flex flex-wrap items-start mt-16 gap-11 md:gap-[88px]"
          >
            <Stat value={totalOwned}        label="Books owned" />
            <Stat value={totalAuthors}      label="Favorite authors" />
            <Stat value={preOrders.length}  label="Pre-orders" />
          </div>

        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6">

        {/* ── Favorite Authors ────────────────────── */}
        <Section
          title="Favorite Authors"
          subtitle={hasImport ? 'Authors with 2+ books in your library — click to browse' : 'Authors you read most — click to browse their books'}
          action={
            <Link
              href="/authors"
              className="eyebrow text-muted-foreground hover:opacity-100 opacity-60 flex items-center gap-1.5 transition-opacity"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {hasImport ? (
            importedFavoriteAuthors.length >= 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
                {importedFavoriteAuthors.slice(0, 6).map((author, i) => (
                  <div key={i} className="group flex items-center gap-3 p-4 bg-card hover:bg-secondary transition-colors">
                    <Link
                      href={`/library?author=${encodeURIComponent(author.name)}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <AuthorAvatar
                        name={author.name}
                        photoUrl={importedPhotos.get(author.name) ?? null}
                        isLoading={photosLoading}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif font-medium text-sm truncate group-hover:opacity-60 transition-opacity">
                          {author.name}
                        </p>
                        <p className="eyebrow mt-0.5 opacity-50">
                          {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => confirmHideAuthor(author.name)}
                      title="Hide author from recommendations"
                      className="shrink-0 p-1 text-muted-foreground opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No favorite authors yet"
                description="Read more books by the same author to build your favorites list."
              />
            )
          ) : favoriteAuthors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {favoriteAuthors.slice(0, 6).map((author) => (
                <Link
                  key={author.id}
                  href={`/library?author=${encodeURIComponent(author.name)}`}
                  className="group flex items-center gap-4 p-4 bg-card hover:bg-secondary transition-colors"
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                    <Image
                      src={author.imageUrl}
                      alt={author.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif font-medium truncate group-hover:opacity-60 transition-opacity">
                      {author.name}
                    </p>
                    <p className="eyebrow mt-0.5 opacity-50">
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

        {/* ── Books You Might Like ──────────────────── */}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
              {arrivals.slice(0, 8).map((book, i) => (
                <div key={book.key} className={i >= 4 ? 'hidden md:block' : ''}>
                  <DiscoveryCard
                    book={book}
                    badge="New This Week"
                    onHide={() => confirmHideBook(book.title, null, hideBook)}
                  />
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

        {/* ── Pre-Orders ────────────────────── */}
        {(isPreOrdersLoading || preOrders.length > 0) && (
          <Section
            title="Pre-Orders from Authors You Read"
            subtitle="Upcoming titles — reserve yours at Ladybird Books"
            className="border-t border-border"
          >
            {isPreOrdersLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={i >= 4 ? 'hidden md:block' : ''}>
                    <DiscoveryCardSkeleton />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
                {preOrders.slice(0, 8).map((book, i) => (
                  <div key={book.key} className={i >= 4 ? 'hidden md:block' : ''}>
                    <DiscoveryCard
                      book={book}
                      preOrder
                      onHide={() => confirmHideBook(book.title, null, hideBook)}
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground">
            The Stack — Track your hardcover collection
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      {/* clamp(48px, 5vw, 76px), weight 400, line-height 1 */}
      <p
        className="font-serif font-normal leading-none"
        style={{ fontSize: 'clamp(48px, 5vw, 76px)' }}
      >
        {value}
      </p>
      {/* 15px, weight 500, tracking 0.18em, uppercase */}
      <p
        className="font-sans font-medium uppercase text-muted-foreground mt-3.5"
        style={{ fontSize: '15px', letterSpacing: '0.18em' }}
      >
        {label}
      </p>
    </div>
  );
}
