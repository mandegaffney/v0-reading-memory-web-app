'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Section, EmptyState } from '@/components/layout';
import { DiscoveryCard, DiscoveryCardSkeleton } from '@/components/discovery-card';
import { AuthorAvatar } from '@/components/author-avatar';
import { AddBookModal } from '@/components/add-book-modal';
import { usePreferences } from '@/lib/preferences';
import { useAuthorBooks } from '@/lib/use-author-books';
import { useNewArrivals } from '@/lib/use-new-arrivals';
import { useAuthorPhotos } from '@/lib/use-author-photos';
import { fetchGoogleBooksCover } from '@/lib/cover-fallback';
import { getFavoriteAuthors, getOwnedBooks } from '@/lib/data';
import { ArrowRight, EyeOff } from 'lucide-react';
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

      {/* ════════════ HERO — scattered editorial grid ════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-7 pb-14 md:pb-16 grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-7 md:gap-y-6">

        {/* kickers */}
        <div
          className="md:col-span-12 md:row-start-1 flex justify-between items-baseline text-[12px] md:text-[12.5px] tracking-[0.5px]"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          <span style={{ color: '#9C5B3F' }}>(01) — reading memory</span>
          <span style={{ color: '#A39B8B' }}>(est. 2026)</span>
        </div>

        {/* headline — roman */}
        <h1
          className="md:col-span-8 md:row-start-2 m-0 font-normal leading-[0.96] tracking-[-0.01em] text-balance"
          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(40px, 7.5vw, 92px)' }}
        >
          Everything you&rsquo;ve read,
        </h1>

        {/* image placeholder */}
        <div
          className="md:col-span-4 md:row-start-2 md:row-span-2 min-h-[220px] md:min-h-[320px] rounded-[4px] flex items-end justify-between p-3.5"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, #D8C0B0 0 9px, #CDB2A0 9px 18px)' }}
        >
          <span className="text-[10.5px]" style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#7a5c4d' }}>
            [ a reading nook ]
          </span>
          <span className="text-[10.5px]" style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#7a5c4d' }}>
            4:5
          </span>
        </div>

        {/* headline — italic */}
        <h1
          className="md:col-span-8 md:row-start-3 m-0 italic font-normal leading-[0.92] tracking-[-0.015em] text-balance"
          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(48px, 9vw, 110px)' }}
        >
          stays with <span style={{ color: '#9C5B3F' }}>you.</span>
        </h1>

        {/* body note — left */}
        <p
          className="md:col-span-4 md:row-start-4 self-end italic m-0"
          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '23px', lineHeight: 1.3, color: '#5F594E' }}
        >
          A quiet record of a reading life — what you finished, and what&rsquo;s next.
        </p>

        {/* body note — right */}
        <p
          className="md:col-span-4 md:col-start-9 md:row-start-4 self-end m-0 text-[14.5px] leading-[1.6]"
          style={{ color: '#5F594E' }}
        >
          <span style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F', fontSize: '12px' }}>
            (1)&nbsp;
          </span>
          Track what you&rsquo;re reading, remember what you finished, and keep the ones you mean to get to.
          Search by title or author — or say it out loud.
        </p>

        {/* CTA row */}
        <div className="md:col-span-6 md:row-start-5 flex items-center gap-5 mt-2 md:mt-0">
          <button
            onClick={() => setAddBookOpen(true)}
            className="m-0 border-0 bg-transparent p-0 cursor-pointer pb-[3px] border-b-[1.5px] border-[#2B2926] transition-colors hover:text-[#9C5B3F] hover:border-[#9C5B3F]"
            style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '28px', color: 'inherit' }}
          >
            Add a book&nbsp;↗
          </button>
          <Link
            href="/library"
            className="text-[12px] transition-colors hover:text-[#9C5B3F]"
            style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
          >
            or browse&nbsp;→
          </Link>
        </div>
        <span
          className="hidden md:flex md:col-span-2 md:col-start-11 md:row-start-5 justify-self-end self-end text-[12px]"
          style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}
        >
          (scroll&nbsp;↓)
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 md:gap-x-[30px] gap-y-10 md:gap-y-[30px]">
            {Array.from({ length: 4 }).map((_, i) => <DiscoveryCardSkeleton key={i} />)}
          </div>
        ) : arrivalsError ? (
          <EmptyState title="Couldn't load new arrivals" description={arrivalsError} />
        ) : arrivals.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 md:gap-x-[30px] gap-y-10 md:gap-y-[30px] pb-14">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 md:gap-x-[30px] gap-y-10 md:gap-y-[30px] pb-14">
              {Array.from({ length: 4 }).map((_, i) => <DiscoveryCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 md:gap-x-[30px] gap-y-10 md:gap-y-[30px] pb-14">
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

        {/* organic cover pile */}
        <div className="relative min-h-[260px] md:min-h-[460px]">
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

      {/* ════════════ STATS + FOOTER — dark, oversized brand ════════════ */}
      <div className="mt-14 md:mt-16" style={{ background: '#2B2926', color: '#F4EFE1' }}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-16 md:pt-20 pb-12">
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

        <div
          className="max-w-[1280px] mx-auto px-6 md:px-12 flex flex-wrap justify-between gap-10 pt-10 border-t text-[13px]"
          style={{ borderColor: '#4D483F', fontFamily: 'var(--font-space-mono), monospace', letterSpacing: '0.3px' }}
        >
          <div className="flex flex-col gap-3">
            <span style={{ color: '#8A8475' }}>(contact)</span>
            <a href="mailto:hello@thestack.app" className="transition-colors hover:text-[#D98F6B]" style={{ color: '#D7D0C2' }}>
              say hello&nbsp;↗
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#D98F6B]" style={{ color: '#D7D0C2' }}>
              instagram&nbsp;↗
            </a>
          </div>
          <div className="flex flex-col gap-3 text-right">
            <span style={{ color: '#8A8475' }}>(index)</span>
            <Link href="/library" className="transition-colors hover:text-[#D98F6B]" style={{ color: '#D7D0C2' }}>
              library
            </Link>
            <Link href="/authors" className="transition-colors hover:text-[#D98F6B]" style={{ color: '#D7D0C2' }}>
              discover · stats
            </Link>
          </div>
        </div>

        <div className="overflow-hidden pt-10 pb-6">
          <div
            className="text-center whitespace-nowrap"
            style={{ fontFamily: 'var(--font-marker)', fontSize: 'clamp(70px, 18vw, 220px)', lineHeight: 0.82, color: '#F4EFE1', letterSpacing: '-0.01em' }}
          >
            The Stack
          </div>
          <div
            className="max-w-[1280px] mx-auto px-6 md:px-12 flex justify-between flex-wrap gap-2 text-[11.5px] tracking-[0.5px]"
            style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#6f685c' }}
          >
            <span>© 2026 THE STACK</span>
            <span>GOOGLE BOOKS &amp; OPEN LIBRARY</span>
          </div>
        </div>
      </div>

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
    fetchGoogleBooksCover(title, author, controller.signal).then(setCover);
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
