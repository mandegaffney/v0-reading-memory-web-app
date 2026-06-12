'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Section, EmptyState } from '@/components/layout';
import { DiscoveryCard, DiscoveryCardSkeleton } from '@/components/discovery-card';
import { AuthorAvatar } from '@/components/author-avatar';
import { AddBookModal } from '@/components/add-book-modal';
import { usePreferences } from '@/lib/preferences';
import { useAuthorBooks } from '@/lib/use-author-books';
import { useNewArrivals } from '@/lib/use-new-arrivals';
import { useAuthorPhotos } from '@/lib/use-author-photos';
import { fetchBookCover } from '@/lib/cover-fallback';
import { getFavoriteAuthors, getOwnedBooks } from '@/lib/data';
import { ArrowRight, ArrowUpRight, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── "Your stack, in order" filter + status helpers ─────────────────────────────

type StackFilter = 'all' | 'reading' | 'finished' | 'want';

interface StackBook {
  title:  string;
  author: string;
  status: 'reading' | 'finished' | 'want';
}

const STATUS_META: Record<StackBook['status'], { label: string; color: string }> = {
  reading:  { label: 'Reading',      color: '#9C5B3F' },
  finished: { label: 'Finished',     color: '#8A8475' },
  want:     { label: 'Want to read', color: '#8A8475' },
};

const FILTERS: StackFilter[] = ['all', 'reading', 'finished', 'want'];

export default function HomePage() {
  // ── All hooks must be called unconditionally before any early return ──────
  const {
    dislikedBookIds, dislikedAuthorIds,
    importedBooks, importedAuthorNames, importedFavoriteAuthors,
    hiddenBooks, hiddenAuthors, hideBook, hideAuthor, addBook,
    isLoading, loadError,
  } = usePreferences();

  const [addBookOpen, setAddBookOpen] = useState(false);
  const [stackFilter, setStackFilter] = useState<StackFilter>('all');

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

  // ── "Your stack, in order" — real library data, mapped to the editorial index ──
  const stackBooks = useMemo<StackBook[]>(() => {
    if (hasImport) {
      return importedBooks.map(b => ({
        title:  b.title,
        author: b.author,
        status: (b.readingStatus ?? 'to-read') === 'to-read' ? 'want' : (b.readingStatus as 'reading' | 'finished'),
      }));
    }
    return ownedBooks.map(b => ({ title: b.title, author: b.authorName, status: 'finished' as const }));
  }, [hasImport, importedBooks, ownedBooks]);

  const filteredStackBooks = useMemo(
    () => stackFilter === 'all' ? stackBooks : stackBooks.filter(b => b.status === stackFilter),
    [stackBooks, stackFilter]
  );

  const visibleStackBooks = filteredStackBooks.slice(0, 10);
  const pileBooks = useMemo(() => {
    const reading = stackBooks.filter(b => b.status === 'reading');
    return (reading.length > 0 ? reading : stackBooks).slice(0, 3);
  }, [stackBooks]);

  // ── Early returns after all hooks ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF8F0] text-[#2B2926]">
        <Header />
        <div className="max-w-[1280px] mx-auto px-6 py-32 text-center">
          <p className="text-sm animate-pulse" style={{ color: '#8A8475' }}>Loading your library…</p>
        </div>
      </div>
    );
  }

  // ── Hide helpers ────────────────────────────────────────────────────────────

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

  async function addToStack(title: string, author: string) {
    try {
      await addBook({
        title, author,
        genre: '', dateOrdered: '', unitPrice: '', totalAmount: '', orderStatus: '', orderId: '',
        readingStatus: 'to-read',
      });
      toast.success(`Added "${title.length > 40 ? title.slice(0, 40) + '…' : title}" to your stack — want to read.`);
    } catch {
      toast.error('Failed to add to your stack. Please try again.');
    }
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
      <div className="min-h-screen bg-[#FBF8F0] text-[#2B2926]">
        <Header />
        <div className="max-w-[1280px] mx-auto px-6 py-32 text-center">
          <p className="text-sm" style={{ color: '#9C5B3F' }}>{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm underline underline-offset-4 transition-colors hover:text-[#9C5B3F]"
            style={{ color: '#8A8475' }}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBF8F0] text-[#2B2926]" style={{ fontFamily: 'var(--font-hanken), sans-serif' }}>
      <Header />

      {/* ════════════ HERO — scattered editorial composition ════════════ */}
      <div className="relative max-w-[1280px] mx-auto px-6 md:px-12 pt-6 md:pt-9 pb-10 md:pb-16 flex flex-col md:min-h-[760px] lg:min-h-[900px]">

        {/* kicker — top-left on desktop, first in flow on mobile */}
        <span
          className="order-1 mb-6 md:mb-0 md:absolute md:left-12 md:top-9 text-[12.5px] tracking-[0.5px]"
          style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}
        >
          (01) — reading memory
        </span>

        {/* headline — big, anchored bottom-left on desktop */}
        <h1
          className="order-2 md:order-none md:absolute md:left-11 md:bottom-14 m-0 font-normal tracking-[-0.025em] leading-[0.9] md:leading-[0.85] text-[52px] sm:text-[64px] md:text-[120px] lg:text-[150px]"
          style={{ fontFamily: 'var(--font-instrument), Georgia, serif' }}
        >
          Everything<br />you&rsquo;ve read,<br />
          <span className="italic">stays with <span style={{ color: '#9C5B3F' }}>you.</span></span>
        </h1>

        {/* copy block — upper-right on desktop, last in flow on mobile */}
        <div className="order-3 mt-8 md:mt-0 md:absolute md:right-12 md:top-20 md:w-[440px] lg:w-[600px]">
          <div className="mb-4 text-[13px]" style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}>
            (1)
          </div>
          <p
            className="m-0 mb-6 leading-[1.3]"
            style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(25px, 4vw, 34px)', color: '#2B2926' }}
          >
            A quiet record of a reading life — what you finished, and what&rsquo;s next.
          </p>
          <p className="m-0 mb-8 text-[17px] leading-[1.6]" style={{ color: '#5F594E' }}>
            Track what you&rsquo;re reading, remember what you finished, and keep the ones you mean to get to — by title, author, or just by saying it out loud.
          </p>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setAddBookOpen(true)}
              className="inline-flex items-center gap-2 whitespace-nowrap m-0 border-0 bg-transparent p-0 cursor-pointer pb-[3px] border-b-[1.5px] border-[#2B2926] transition-colors hover:text-[#9C5B3F] hover:border-[#9C5B3F]"
              style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '28px', color: 'inherit' }}
            >
              Add a book
              <ArrowUpRight className="w-6 h-6 shrink-0" strokeWidth={1.5} />
            </button>
            <Link
              href="/library"
              className="whitespace-nowrap text-[12px] transition-colors hover:text-[#9C5B3F]"
              style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
            >
              or browse&nbsp;→
            </Link>
          </div>
        </div>

        {/* est. marker — bottom-right on desktop, hidden on mobile */}
        <span
          className="hidden md:block md:absolute md:right-12 md:bottom-[60px] text-[12.5px] tracking-[0.5px]"
          style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
        >
          (est. 2026)
        </span>
      </div>

      {/* ════════════ BOOKS YOU MIGHT LOVE ════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-2">
        <div className="flex items-baseline justify-between gap-6 mb-1.5">
          <span
            className="text-[12.5px] tracking-[0.5px]"
            style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}
          >
            (02) — for you
          </span>
          {updatedAt && (
            <span
              className="text-[12px] tracking-[0.5px] whitespace-nowrap"
              style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
            >
              updated {updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase()}
            </span>
          )}
        </div>
        <h2
          className="m-0 mb-1.5 font-normal leading-[0.98] tracking-[-0.01em] text-balance"
          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(36px, 5.5vw, 56px)' }}
        >
          Books you might <span className="italic" style={{ color: '#9C5B3F' }}>love</span>
        </h2>
        <p
          className="m-0 mb-9 italic"
          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '21px', color: '#5F594E' }}
        >
          New arrivals matched to your reading taste.
        </p>

        {isArrivalsLoading ? (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-x-5 md:gap-x-[30px] gap-y-10 md:gap-y-[30px]">
            {Array.from({ length: 4 }).map((_, i) => <DiscoveryCardSkeleton key={i} />)}
          </div>
        ) : arrivalsError ? (
          <EmptyState title="Couldn't load new arrivals" description={arrivalsError} />
        ) : arrivals.length > 0 ? (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-x-5 md:gap-x-[30px] gap-y-10 md:gap-y-[30px] pb-14">
            {arrivals.slice(0, 4).map((book, i) => (
              <DiscoveryCard
                key={book.key}
                book={book}
                index={i}
                badge="New This Week"
                dismissLabel="(never show me this again)"
                onHide={() => confirmHideBook(book.title, null, hideBook)}
                onWant={() => addToStack(book.title, book.authorName)}
              />
            ))}
          </div>
        ) : (
          <div className="pb-14">
            <EmptyState
              title="Check back soon"
              description="We'll match new Ladybird arrivals to your taste as they come in."
            />
          </div>
        )}
      </div>

      {/* ════════════ PRE-ORDERS ════════════ */}
      {(isPreOrdersLoading || preOrders.length > 0) && (
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-2 pb-2">
          <div className="flex items-baseline justify-between gap-6 mb-1.5">
            <span
              className="text-[12.5px] tracking-[0.5px]"
              style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}
            >
              (03) — coming soon
            </span>
            <span
              className="text-[12px] tracking-[0.5px] whitespace-nowrap"
              style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
            >
              reserve at ladybird books
            </span>
          </div>
          <h2
            className="m-0 mb-1.5 font-normal leading-[0.98] tracking-[-0.01em] text-balance"
            style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(36px, 5.5vw, 56px)' }}
          >
            Pre-orders from authors <span className="italic">you read</span>
          </h2>
          <p
            className="m-0 mb-9 italic"
            style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '21px', color: '#5F594E' }}
          >
            Upcoming titles from names already on your shelf.
          </p>

          {isPreOrdersLoading ? (
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-x-5 md:gap-x-[30px] gap-y-10 md:gap-y-[30px] pb-14">
              {Array.from({ length: 4 }).map((_, i) => <DiscoveryCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-x-5 md:gap-x-[30px] gap-y-10 md:gap-y-[30px] pb-14">
              {preOrders.slice(0, 4).map((book, i) => (
                <DiscoveryCard
                  key={book.key}
                  book={book}
                  index={i}
                  badge="PRE-ORDER"
                  preOrder
                  dismissLabel="(not interested)"
                  onHide={() => confirmHideBook(book.title, null, hideBook)}
                  onWant={() => addToStack(book.title, book.authorName)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════ YOUR STACK — editorial index + cover pile ════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-10 md:pt-20 pb-10 grid grid-cols-1 md:grid-cols-[1.55fr_1fr] gap-12 md:gap-16">

        {/* index */}
        <div>
          <div className="flex items-baseline justify-between mb-3.5 gap-4 flex-wrap">
            <span
              className="text-[12.5px] tracking-[0.5px]"
              style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}
            >
              (04) — on the shelf
            </span>
            <div className="flex gap-4 text-[13px]" style={{ fontFamily: 'var(--font-space-mono), monospace' }}>
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setStackFilter(f)}
                  className="bg-transparent border-0 border-b-2 cursor-pointer pb-[3px] px-0 transition-colors"
                  style={{
                    color: stackFilter === f ? '#2B2926' : '#A39B8B',
                    borderBottomColor: stackFilter === f ? '#9C5B3F' : 'transparent',
                  }}
                >
                  ({f})
                </button>
              ))}
            </div>
          </div>

          <h2
            className="m-0 mb-6 font-normal leading-[0.98] tracking-[-0.01em] text-balance"
            style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(36px, 5.5vw, 56px)' }}
          >
            Your stack, in order
          </h2>

          <div>
            {visibleStackBooks.length > 0 ? (
              visibleStackBooks.map((book, i) => {
                const meta = STATUS_META[book.status];
                return (
                  <div
                    key={`${book.title}-${i}`}
                    className="group grid grid-cols-[32px_1fr_auto_28px] md:grid-cols-[44px_1fr_auto_28px] items-center gap-3 md:gap-[18px] py-5 px-2 md:px-1 border-t transition-colors hover:bg-[#F4EFE1] cursor-default"
                    style={{ borderColor: '#E0D9C8' }}
                  >
                    <span
                      className="text-[13px] transition-colors group-hover:text-[#9C5B3F]"
                      style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#B3AB9A' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex flex-col gap-px">
                      <span
                        className="leading-[1.04] tracking-[-0.01em] truncate"
                        style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '24px' }}
                      >
                        {book.title}
                      </span>
                      <span className="text-[13.5px] truncate" style={{ color: '#8A8475' }}>
                        {book.author}
                      </span>
                    </div>
                    <span
                      className="text-[10.5px] font-bold uppercase tracking-[0.6px] whitespace-nowrap"
                      style={{ fontFamily: 'var(--font-space-mono), monospace', color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span
                      className="justify-self-end text-[15px] opacity-0 -translate-x-1.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                      style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}
                    >
                      ↗
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center border-t" style={{ borderColor: '#E0D9C8' }}>
                <p className="text-sm" style={{ color: '#8A8475' }}>No books match this filter yet.</p>
              </div>
            )}
            <div className="border-t" style={{ borderColor: '#E0D9C8' }} />
          </div>

          {filteredStackBooks.length > visibleStackBooks.length && (
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 mt-6 text-[12px] transition-colors hover:text-[#9C5B3F]"
              style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
            >
              (view full library →)
            </Link>
          )}
        </div>

        {/* organic cover pile — hidden on mobile, per the editorial layout */}
        <div className="hidden md:block relative min-h-[460px]">
          <span
            className="text-[12.5px] tracking-[0.5px]"
            style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
          >
            (currently reading)
          </span>
          <div className="relative mt-9 h-[280px] md:h-[420px]">
            {pileBooks.length > 0 ? (
              pileBooks.map((b, i) => (
                <PileCover
                  key={`${b.title}-${i}`}
                  title={b.title}
                  author={b.author}
                  rotate={[6, -5, -1][i] ?? 0}
                  top={['18px', '60px', '96px'][i] ?? '0'}
                  left={['96px', '40px', '8px'][i] ?? '0'}
                  width={i === 2 ? '176px' : '168px'}
                  height={i === 2 ? '264px' : '252px'}
                  showCaption={i === 2}
                />
              ))
            ) : (
              <p className="text-sm" style={{ color: '#8A8475' }}>
                Add a book to start your stack.
              </p>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-6 md:px-12">

        {/* ── Favorite Authors ──────────────────────────────── */}
        <Section
          title="Favorite Authors"
          subtitle={hasImport ? 'Authors with 2+ books in your library — click to browse' : 'Authors you read most — click to browse their books'}
          className="border-t"
          action={
            <Link
              href="/authors"
              className="eyebrow flex items-center gap-1.5 transition-colors hover:text-[#9C5B3F]"
              style={{ color: '#8A8475' }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {hasImport ? (
            importedFavoriteAuthors.length >= 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: '#E7E0D0' }}>
                {importedFavoriteAuthors.slice(0, 6).map((author, i) => (
                  <div key={i} className="group flex items-center gap-3 p-4 bg-[#FBF8F0] hover:bg-[#F4EFE1] transition-colors">
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
                        <p
                          className="font-medium text-sm truncate group-hover:text-[#9C5B3F] transition-colors"
                          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '17px' }}
                        >
                          {author.name}
                        </p>
                        <p className="eyebrow mt-0.5" style={{ color: '#A39B8B' }}>
                          {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => confirmHideAuthor(author.name)}
                      title="Hide author from recommendations"
                      className="shrink-0 p-1 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                      style={{ color: '#8A8475' }}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: '#E7E0D0' }}>
              {favoriteAuthors.slice(0, 6).map((author) => (
                <Link
                  key={author.id}
                  href={`/library?author=${encodeURIComponent(author.name)}`}
                  className="group flex items-center gap-4 p-4 bg-[#FBF8F0] hover:bg-[#F4EFE1] transition-colors"
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#E7E0D0] shrink-0 ring-1" style={{ borderColor: '#E7E0D0' }}>
                    <Image
                      src={author.imageUrl}
                      alt={author.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-medium truncate group-hover:text-[#9C5B3F] transition-colors"
                      style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '19px' }}
                    >
                      {author.name}
                    </p>
                    <p className="eyebrow mt-0.5" style={{ color: '#A39B8B' }}>
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

      </main>

      {/* ════════════ STATS — dark, oversized brand ════════════ */}
      <div className="mt-14 md:mt-16 pt-16 md:pt-20 pb-12" style={{ background: '#2B2926', color: '#F4EFE1' }}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <span
            className="text-[12.5px] tracking-[0.5px]"
            style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#D98F6B' }}
          >
            (05) — this year
          </span>
          <div
            className="mt-6 leading-[1.12] tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(32px, 6vw, 64px)' }}
          >
            <div>{totalOwned} {totalOwned === 1 ? 'book' : 'books'}<span style={{ color: '#D98F6B' }}>,</span></div>
            <div>{totalAuthors} favorite {totalAuthors === 1 ? 'author' : 'authors'}<span style={{ color: '#D98F6B' }}>,</span></div>
            <div className="italic">{preOrders.length} more on the way.</div>
          </div>
        </div>
      </div>

      <Footer />

      <AddBookModal open={addBookOpen} onOpenChange={setAddBookOpen} />
    </div>
  );
}

// ── Cover-pile item ─────────────────────────────────────────────────────────────

function PileCover({
  title, author, rotate, top, left, width, height, showCaption,
}: {
  title:       string;
  author:      string;
  rotate:      number;
  top:         string;
  left:        string;
  width:       string;
  height:      string;
  showCaption: boolean;
}) {
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchBookCover(title, author, controller.signal).then(setCover);
    return () => controller.abort();
  }, [title, author]);

  return (
    <div
      className="absolute rounded-[4px] overflow-hidden"
      style={{ top, left, width, height, transform: `rotate(${rotate}deg)`, boxShadow: '0 16px 34px -16px rgba(30,28,22,0.45)' }}
    >
      {cover ? (
        <Image src={cover} alt={title} fill className="object-cover" sizes="180px" />
      ) : (
        <div
          className="w-full h-full flex flex-col justify-end p-4"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, #D8C0B0 0 9px, #CDB2A0 9px 18px)' }}
        >
          {showCaption && (
            <span
              className="italic leading-[1.05] line-clamp-2"
              style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '22px', color: '#5a4034' }}
            >
              {title}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
