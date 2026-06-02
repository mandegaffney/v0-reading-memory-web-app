import { useState } from 'react';
import Image from 'next/image';
import type { DiscoveryBook } from '@/lib/use-author-books';

interface DiscoveryCardProps {
  book:      DiscoveryBook;
  preOrder?: boolean;
  /** Badge text overlaid on the cover — e.g. "New This Week". */
  badge?:    string;
}

export function DiscoveryCard({ book, preOrder = false, badge }: DiscoveryCardProps) {
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

        {/* Magazine-stamp badge — uppercase, tracked, black on white */}
        {badgeLabel && (
          <div className="absolute top-2.5 left-2.5 bg-background px-2 py-1">
            <span className="badge-stamp text-foreground">
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

      {/* Editorial buy link — sharp border, uppercase, black outline */}
      <a
        href={book.buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-4 inline-flex items-center justify-center gap-1.5 text-[9px] font-sans font-medium uppercase tracking-[0.18em] text-foreground border border-foreground px-3 py-2 hover:bg-foreground hover:text-background transition-colors duration-150"
      >
        Buy at Ladybird
      </a>
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
