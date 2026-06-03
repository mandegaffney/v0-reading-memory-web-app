import { useState } from 'react';
import Image from 'next/image';
import type { DiscoveryBook } from '@/lib/use-author-books';

interface DiscoveryCardProps {
  book:      DiscoveryBook;
  preOrder?: boolean;
  /** Badge text overlaid on the cover — e.g. "New This Week". */
  badge?:    string;
  /** Called when the user taps "Not interested" — caller handles the hide logic. */
  onHide?:   () => void;
}

export function DiscoveryCard({ book, preOrder = false, badge, onHide }: DiscoveryCardProps) {
  const [imgError, setImgError] = useState(false);
  const badgeLabel = badge ?? (preOrder ? 'Pre-Order' : null);

  return (
    <div className="flex flex-col group">
      {/* Cover — hero of the card, no heavy shadow */}
      <div className="relative aspect-[2/3] bg-muted overflow-hidden mb-4">
        {book.coverUrl && !imgError ? (
          <Image
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(min-width: 768px) 25vw, 50vw"
            onError={() => setImgError(true)}
          />
        ) : (
          /* No-cover placeholder — title in serif on warm surface */
          <div className="w-full h-full flex items-center justify-center p-4 bg-secondary">
            <span className="text-muted-foreground text-sm text-center font-serif italic leading-snug line-clamp-4">
              {book.title}
            </span>
          </div>
        )}

        {/* Magazine-stamp badge — flex-centred, 6px vertical / 12px horizontal */}
        {badgeLabel && (
          <div className="absolute top-2.5 left-2.5 bg-background inline-flex items-center justify-center px-3 py-1.5">
            <span className="badge-stamp text-foreground leading-none">
              {badgeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <h3 className="font-serif text-base font-medium leading-snug line-clamp-2 mb-1 tracking-tight">
        {book.title}
      </h3>
      {book.authorName && (
        <p className="text-xs text-muted-foreground truncate tracking-wide">{book.authorName}</p>
      )}
      {book.publishYear && (
        <p className="text-xs text-muted-foreground mt-0.5">{book.publishYear}</p>
      )}

      {/* Editorial buy link — 24px horizontal, 14px vertical, flex-centred */}
      <a
        href={book.buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-6 inline-flex items-center justify-center gap-1.5 text-[9px] font-sans font-medium uppercase tracking-[0.18em] leading-none text-foreground border border-foreground px-6 py-[14px] hover:bg-foreground hover:text-background transition-colors duration-150"
      >
        Buy at Ladybird
      </a>

      {/* Not interested — discreet, shown only when handler is provided */}
      {onHide && (
        <button
          onClick={onHide}
          className="mt-2 text-[9px] uppercase tracking-[0.12em] leading-none text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100 transition-all"
        >
          Not interested
        </button>
      )}
    </div>
  );
}

export function DiscoveryCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="aspect-[2/3] bg-muted mb-4" />
      <div className="h-4 bg-muted mb-1.5 w-4/5" />
      <div className="h-3 bg-muted mb-1 w-3/5" />
      <div className="h-3 bg-muted mb-4 w-2/5" />
      <div className="h-8 bg-muted w-full mt-auto" />
    </div>
  );
}
