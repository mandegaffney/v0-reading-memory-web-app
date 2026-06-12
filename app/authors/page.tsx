'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { usePreferences } from '@/lib/preferences';
import { useAuthorPhotos } from '@/lib/use-author-photos';
import { authors } from '@/lib/data';
import { EyeOff, Eye } from 'lucide-react';

// Warm striped placeholder tints, cycled by card index — echoes the cover pile on "Your stack".
const PLACEHOLDER_TINTS: [string, string][] = [
  ['#BBB2A2', '#ADA493'],
  ['#CFC7B6', '#C2B9A6'],
  ['#D8C0B0', '#CDB2A0'],
  ['#C99B86', '#BE8E78'],
];

// Slight rotations for the organic, scattered-portrait look — cycled by card index.
const TILTS = ['-2deg', '1.5deg', '-1deg', '2deg', '1deg', '-1.5deg'];

export default function AuthorsPage() {
  const { dislikedAuthorIds, dislikeAuthor, unDislikeAuthor, importedBooks, importedFavoriteAuthors } = usePreferences();

  const hasImport       = importedBooks.length > 0;
  const staticFavorites = authors.filter(a => a.isFavorite);
  const staticOthers    = authors.filter(a => !a.isFavorite);

  // From the qualified favorites, filter out any that overlap with known static authors
  const knownNamesLower        = new Set(authors.map(a => a.name.toLowerCase()));
  const importedFavoriteOnly   = importedFavoriteAuthors.filter(
    ({ name }) => !knownNamesLower.has(name.toLowerCase())
  );

  // Fetch Open Library photos for those authors
  const { photos: importedPhotos, isLoading: photosLoading } = useAuthorPhotos(
    importedFavoriteOnly.map(a => a.name)
  );

  const hasFavorites = hasImport
    ? importedFavoriteAuthors.length >= 2
    : staticFavorites.length > 0;

  return (
    <div className="min-h-screen">
      <Header />

      {/* ════════════ HEADER — editorial title, matches the library page ════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 pt-10 md:pt-16 pb-8">
        <span
          className="text-[12.5px] tracking-[0.5px]"
          style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}
        >
          (favorite authors)
        </span>
        <h1
          className="m-0 mt-3 font-normal leading-[0.98] tracking-[-0.01em] text-balance"
          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: 'clamp(40px, 6vw, 72px)' }}
        >
          Authors you <span className="italic">return</span> to
        </h1>
      </div>

      <main className="max-w-[1280px] mx-auto px-6 md:px-12 pb-20">

        {/* ── Favorites ── */}
        {hasFavorites ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-12 md:gap-y-14 pt-10 border-t" style={{ borderColor: '#E0D9C8' }}>
              {hasImport
                ? importedFavoriteOnly.map((author, i) => (
                    <AuthorCard
                      key={`imported-${i}`}
                      index={i}
                      name={author.name}
                      href={`/library?author=${encodeURIComponent(author.name)}`}
                      photoUrl={importedPhotos.get(author.name) ?? null}
                      isLoading={photosLoading}
                      caption={`${author.bookCount} ${author.bookCount === 1 ? 'book' : 'books'}`}
                    />
                  ))
                : null}

              {staticFavorites.map((author, i) => {
                const isDisliked = dislikedAuthorIds.includes(author.id);
                return (
                  <AuthorCard
                    key={author.id}
                    index={(hasImport ? importedFavoriteOnly.length : 0) + i}
                    name={author.name}
                    href={`/author/${author.id}`}
                    photoUrl={author.imageUrl}
                    caption={`${author.booksOwned} ${author.booksOwned === 1 ? 'book' : 'books'} owned`}
                    dimmed={isDisliked}
                    action={
                      <button
                        onClick={() => isDisliked ? unDislikeAuthor(author.id) : dislikeAuthor(author.id)}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-[#9C5B3F]"
                        style={{ fontFamily: 'var(--font-space-mono), monospace', fontSize: '11px', letterSpacing: '0.4px', color: '#A39B8B' }}
                      >
                        {isDisliked ? <><Eye className="w-3 h-3" /> show</> : <><EyeOff className="w-3 h-3" /> hide</>}
                      </button>
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center border-t" style={{ borderColor: '#E0D9C8' }}>
            <p className="text-sm" style={{ color: '#8A8475' }}>
              Read more books by the same author to build your favorites list.
            </p>
          </div>
        )}

        {/* ── Also in Your Collection ── */}
        {staticOthers.length > 0 && (
          <div className="mt-16 pt-12 border-t" style={{ borderColor: '#E0D9C8' }}>
            <span
              className="text-[12.5px] tracking-[0.5px]"
              style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#9C5B3F' }}
            >
              (also in your collection)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-12 md:gap-y-14 mt-8">
              {staticOthers.map((author, i) => {
                const isDisliked = dislikedAuthorIds.includes(author.id);
                return (
                  <AuthorCard
                    key={author.id}
                    index={i}
                    name={author.name}
                    href={`/author/${author.id}`}
                    photoUrl={author.imageUrl}
                    caption={`${author.booksOwned} ${author.booksOwned === 1 ? 'book' : 'books'} owned`}
                    dimmed={isDisliked}
                    action={
                      <button
                        onClick={() => isDisliked ? unDislikeAuthor(author.id) : dislikeAuthor(author.id)}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-[#9C5B3F]"
                        style={{ fontFamily: 'var(--font-space-mono), monospace', fontSize: '11px', letterSpacing: '0.4px', color: '#A39B8B' }}
                      >
                        {isDisliked ? <><Eye className="w-3 h-3" /> show</> : <><EyeOff className="w-3 h-3" /> hide</>}
                      </button>
                    }
                  />
                );
              })}
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

// ── Organic author card — rotated portrait, serif name, mono caption ───────────

function AuthorCard({
  name, href, photoUrl, isLoading = false, caption, index, dimmed = false, action,
}: {
  name:       string;
  href:       string;
  photoUrl:   string | null;
  isLoading?: boolean;
  caption:    string;
  index:      number;
  dimmed?:    boolean;
  action?:    React.ReactNode;
}) {
  const [tintA, tintB] = PLACEHOLDER_TINTS[index % PLACEHOLDER_TINTS.length];
  const tilt = TILTS[index % TILTS.length];

  return (
    <div className={dimmed ? 'opacity-40' : ''}>
      <Link href={href} className="group block">
        <div className="relative mb-4" style={{ transform: `rotate(${tilt})` }}>
          <div className="relative aspect-[4/5] rounded-[4px] overflow-hidden shadow-[0_16px_34px_-18px_rgba(30,28,22,0.5)]">
            {isLoading ? (
              <div className="w-full h-full animate-pulse" style={{ background: '#E7E0D0' }} />
            ) : photoUrl ? (
              <Image
                src={photoUrl}
                alt={name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundImage: `repeating-linear-gradient(135deg, ${tintA} 0 9px, ${tintB} 9px 18px)` }}
              >
                <span
                  className="leading-none"
                  style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '40px', color: '#2B2926', opacity: 0.5 }}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          className="leading-[1.08] tracking-[-0.01em] truncate transition-colors group-hover:text-[#9C5B3F]"
          style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '21px' }}
        >
          {name}
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="text-[12px] truncate" style={{ fontFamily: 'var(--font-space-mono), monospace', color: '#A39B8B' }}>
          {caption}
        </span>
        {action}
      </div>
    </div>
  );
}
