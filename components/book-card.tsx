import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Book } from '@/lib/data';
import { AlertTriangle, Check } from 'lucide-react';

interface BookCardProps {
  book: Book;
  showStatus?: boolean;
  showReason?: boolean;
  className?: string;
}

export function BookCard({ book, showStatus = true, showReason = false, className }: BookCardProps) {
  return (
    <Link
      href={`/book/${book.id}`}
      className={cn(
        "group block",
        className
      )}
    >
      <article className="flex flex-col">
        <div className="relative aspect-[2/3] bg-muted rounded-sm overflow-hidden mb-4">
          <Image
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          />
          {showStatus && book.isOwned && (
            <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-sm flex items-center gap-1">
              <Check className="w-3 h-3 text-accent" />
              <span className="text-xs text-foreground">Owned</span>
            </div>
          )}
          {showStatus && book.isPreOrder && (
            <div className="absolute top-2 right-2 bg-accent/90 backdrop-blur-sm px-2 py-1 rounded-sm">
              <span className="text-xs text-accent-foreground">Pre-order</span>
            </div>
          )}
        </div>
        <h3 className="font-serif text-base font-medium leading-tight mb-1 group-hover:text-accent transition-colors line-clamp-2">
          {book.title}
        </h3>
        <p className="text-sm text-muted-foreground">{book.authorName}</p>
        {showReason && book.whyRecommended && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            {book.whyRecommended}
          </p>
        )}
      </article>
    </Link>
  );
}

interface DuplicateWarningProps {
  book: Book;
}

export function DuplicateWarning({ book }: DuplicateWarningProps) {
  if (!book.isOwned) return null;
  
  return (
    <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-sm p-4">
      <AlertTriangle className="w-5 h-5 text-warning-foreground shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-warning-foreground">
          You already own this book
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Purchased on {new Date(book.publishDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
