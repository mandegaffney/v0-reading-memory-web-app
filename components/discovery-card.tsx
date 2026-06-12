import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { DiscoveryBook } from '@/lib/use-author-books';
import { fetchGoogleBooksCover } from '@/lib/cover-fallback';

// Warm striped placeholder tints, cycled by card index — echoes the cover pile on "Your stack".
const PLACEHOLDER_TINTS: [string, string][] = [
  ['#BBB2A2', '#ADA493'],
  ['#CFC7B6', '#C2B9A6'],
  ['#D8C0B0', '#CDB2A0'],
  ['#C99B86', '#BE8E78'],
];

// Slight rotations for the organic, scattered-cover look — cycled by card index.
const TILTS = ['-2deg', '1.5deg', '-1deg', '2deg'];

interface DiscoveryCardProps {
  book:          DiscoveryBook;
  index:         number;
  preOrder?:     boolean;
  /** Badge text overlaid on the cover — e.g. "New This Week". */
  badge?:        string;
  /** Label for the dismiss link — e.g. "(never show me this again)" or "(not interested)". */
  dismissLabel:  string;
  /** Called when the user dismisses the card — caller handles the hide logic. */
  onHide:        () => void;
  /** Called when the user taps "+ Want to read" — caller handles persistence. */
  onWant:        () => Promise<void>;
}

export function DiscoveryCard({ book, index, preOrder = false, badge, dismissLabel, onHide, onWant }: DiscoveryCardProps) {
  const [imgError, setImgError]         = useState(false);
  const [fallbackCover, setFallbackCover] = useState<string | null>(null);
  const [wanted, setWanted]             = useState(false);
  const [adding, setAdding]             = useState(false);

  // Fall back to Google Books when Open Library has no cover for this title
  useEffect(() => {
    if (book.coverUrl) return;
    const controller = new AbortController();
    fetchGoogleBooksCover(book.title, book.authorName, controller.signal).then(setFallbackCover);
    return () => controller.abort();
  }, [book.coverUrl, book.title, book.authorName]);

  const coverUrl = book.coverUrl ?? fallbackCover;
  const [tintA, tintB] = PLACEHOLDER_TINTS[index % PLACEHOLDER_TINTS.length];
  const tilt = TILTS[index % TILTS.length];

  const handleWant = async () => {
    if (wanted || adding) return;
    setAdding(true);
    try {
      await onWant();
      setWanted(true);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Cover */}
      <div className="relative mb-[18px]" style={{ transform: `rotate(${tilt})` }}>
        <div className="relative aspect-[3/4] rounded-[4px] overflow-hidden shadow-[0_16px_34px_-18px_rgba(30,28,22,0.5)]">
          {coverUrl && !imgError ? (
            <Image
              src={coverUrl}
              alt={`Cover of ${book.title}`}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ backgroundImage: `repeating-linear-gradient(135deg, ${tintA} 0 9px, ${tintB} 9px 18px)` }}
            />
          )}

          {/* Badge */}
          {badge && (
            <span
              className="absolute top-3 left-3 font-bold uppercase leading-none rounded-[3px] px-2 py-1"
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '9.5px',
                letterSpacing: '0.8px',
                color: '#2B2926',
                background: '#FBF8F0',
                border: '1px solid #2B2926',
              }}
            >
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Title + meta */}
      <div
        className="leading-[1.08] tracking-[-0.01em] line-clamp-2 min-h-[54px]"
        style={{ fontFamily: 'var(--font-instrument), serif', fontSize: '25px' }}
      >
        {book.title}
      </div>
      <div className="text-[13.5px] mt-1" style={{ color: '#8A8475' }}>
        {book.authorName}{book.publishYear ? ` · ${book.publishYear}` : ''}
      </div>

      {/* Want to read */}
      <button
        onClick={handleWant}
        disabled={wanted || adding}
        className="mt-4 self-start rounded-[4px] px-5 py-2.5 font-bold uppercase transition-colors disabled:cursor-default"
        style={{
          fontFamily: 'var(--font-hanken), sans-serif',
          fontSize: '11.5px',
          letterSpacing: '1.2px',
          ...(wanted
            ? { background: '#9C5B3F', border: '1.5px solid #9C5B3F', color: '#F4EFE1' }
            : { background: 'transparent', border: '1.5px solid #2B2926', color: '#2B2926' }),
        }}
      >
        {wanted ? '✓ On your list' : adding ? 'Adding…' : '+ Want to read'}
      </button>

      {/* Secondary actions */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {preOrder && (
          <a
            href={book.buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#9C5B3F]"
            style={{ fontFamily: 'var(--font-space-mono), monospace', fontSize: '11px', letterSpacing: '0.4px', color: '#5F594E' }}
          >
            buy at ladybird&nbsp;↗
          </a>
        )}
        {!preOrder && (
          <a
            href={book.buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#9C5B3F]"
            style={{ fontFamily: 'var(--font-space-mono), monospace', fontSize: '11px', letterSpacing: '0.4px', color: '#5F594E' }}
          >
            buy at ladybird&nbsp;↗
          </a>
        )}
        <button
          onClick={onHide}
          className="bg-transparent border-0 p-0 cursor-pointer transition-colors hover:text-[#9C5B3F]"
          style={{ fontFamily: 'var(--font-space-mono), monospace', fontSize: '11px', letterSpacing: '0.4px', color: '#A39B8B' }}
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}

export function DiscoveryCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="aspect-[3/4] rounded-[4px] bg-muted mb-[18px]" />
      <div className="h-6 bg-muted mb-1.5 w-4/5" />
      <div className="h-3 bg-muted mb-4 w-3/5" />
      <div className="h-9 bg-muted w-32" />
    </div>
  );
}
