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
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
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
          <div className="absolute top-[22px] left-[22px] bg-background border border-foreground inline-flex items-center justify-center px-[18px] py-3">
            <span className="text-[13px] font-sans font-semibold uppercase tracking-[0.16em] leading-none text-foreground">
              {badgeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <h3 className="font-serif text-[28px] font-medium leading-[1.1] line-clamp-2 mb-1 tracking-[0.005em] mt-6">
        {book.title}
      </h3>
      {book.authorName && (
        <p className="text-base text-muted-foreground truncate mt-2.5">{book.authorName}</p>
      )}
      {book.publishYear && (
        <p className="text-base text-muted-foreground mt-1">{book.publishYear}</p>
      )}

      {/* Buy button — full width per design */}
      <a
        href={book.buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 w-full flex items-center justify-center text-[13px] font-sans font-semibold uppercase tracking-[0.16em] leading-none text-foreground border border-foreground py-[17px] hover:bg-foreground hover:text-background transition-colors duration-150"
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
