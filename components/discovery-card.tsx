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
      {/* Cover */}
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
          <div className="w-full h-full flex items-center justify-center p-4 bg-secondary">
            <span className="text-muted-foreground text-sm text-center font-serif italic leading-snug line-clamp-4">
              {book.title}
            </span>
          </div>
        )}

        {/* Badge — outlined: cream fill + black border */}
        {badgeLabel && (
          <div className="absolute top-2.5 left-2.5 bg-background border border-foreground inline-flex items-center justify-center px-3 py-1.5">
            <span className="badge-stamp text-foreground leading-none">
              {badgeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Meta — larger title per design */}
      <h3 className="font-serif text-xl font-medium leading-snug line-clamp-2 mb-1 tracking-tight">
        {book.title}
      </h3>
      {book.authorName && (
        <p className="text-xs text-muted-foreground truncate tracking-wide">{book.authorName}</p>
      )}
      {book.publishYear && (
        <p className="text-xs text-muted-foreground mt-0.5">{book.publishYear}</p>
      )}

      {/* Buy button — full width per design */}
      <a
        href={book.buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-6 w-full flex items-center justify-center text-[9px] font-sans font-medium uppercase tracking-[0.18em] leading-none text-foreground border border-foreground py-[14px] hover:bg-foreground hover:text-background transition-colors duration-150"
      >
        Buy at Ladybird
      </a>

      {/* Not interested */}
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
      <div className="h-5 bg-muted mb-1.5 w-4/5" />
      <div className="h-3 bg-muted mb-1 w-3/5" />
      <div className="h-3 bg-muted mb-4 w-2/5" />
      <div className="h-[43px] bg-muted w-full mt-auto" />
    </div>
  );
}
