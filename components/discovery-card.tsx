import { useState } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import type { DiscoveryBook } from '@/lib/use-author-books';

interface DiscoveryCardProps {
  book: DiscoveryBook;
  preOrder?: boolean;
  /** Optional badge text overlaid on the cover — e.g. "New This Week". */
  badge?: string;
}

export function DiscoveryCard({ book, preOrder = false, badge }: DiscoveryCardProps) {
  const [imgError, setImgError] = useState(false);
  const badgeLabel = badge ?? (preOrder ? 'Pre-Order' : null);

  return (
    <div className="flex flex-col">
      {/* Cover */}
      <div className="relative aspect-[2/3] bg-muted rounded-sm overflow-hidden mb-3">
        {book.coverUrl && !imgError ? (
          <Image
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 25vw, 50vw"
            onError={() => setImgError(true)}
          />
        ) : (
          /* No-cover / broken-image placeholder — title on a muted background */
          <div className="w-full h-full flex items-center justify-center p-3">
            <span className="text-muted-foreground text-xs text-center font-serif leading-snug line-clamp-4">
              {book.title}
            </span>
          </div>
        )}

        {badgeLabel && (
          <div className="absolute top-2 left-2 bg-foreground/90 backdrop-blur-sm px-2 py-0.5 rounded-sm">
            <span className="text-xs text-background font-medium tracking-wide">
              {badgeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <h3 className="font-serif text-sm font-medium leading-snug line-clamp-2 mb-1">
        {book.title}
      </h3>
      {book.authorName && (
        <p className="text-xs text-muted-foreground truncate">{book.authorName}</p>
      )}
      {book.publishYear && (
        <p className="text-xs text-muted-foreground">{book.publishYear}</p>
      )}

      {/* Buy link */}
      <a
        href={book.buyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground border border-border rounded-sm px-2.5 py-1.5 hover:bg-muted transition-colors"
      >
        <ExternalLink className="w-3 h-3 shrink-0" />
        Buy at Ladybird
      </a>
    </div>
  );
}

export function DiscoveryCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="aspect-[2/3] bg-muted rounded-sm mb-3" />
      <div className="h-3.5 bg-muted rounded-sm mb-1.5 w-4/5" />
      <div className="h-3 bg-muted rounded-sm mb-1 w-3/5" />
      <div className="h-3 bg-muted rounded-sm mb-3 w-2/5" />
      <div className="h-7 bg-muted rounded-sm w-full mt-auto" />
    </div>
  );
}
