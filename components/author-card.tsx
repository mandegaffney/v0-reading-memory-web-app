import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Author } from '@/lib/data';

interface AuthorCardProps {
  author: Author;
  compact?: boolean;
  className?: string;
}

export function AuthorCard({ author, compact = false, className }: AuthorCardProps) {
  return (
    <Link
      href={`/author/${author.id}`}
      className={cn(
        "group block",
        className
      )}
    >
      <article className={cn(
        "flex items-center",
        compact ? "gap-3" : "gap-4"
      )}>
        <div className={cn(
          "relative shrink-0 rounded-full overflow-hidden bg-muted",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}>
          <Image
            src={author.imageUrl}
            alt={author.name}
            fill
            className="object-cover"
            sizes={compact ? "48px" : "64px"}
          />
        </div>
        <div className="min-w-0">
          <h3 className={cn(
            "font-serif font-medium leading-tight group-hover:text-accent transition-colors truncate",
            compact ? "text-sm" : "text-base"
          )}>
            {author.name}
          </h3>
          <p className={cn(
            "text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}>
            {author.booksOwned} {author.booksOwned === 1 ? 'book' : 'books'}
          </p>
        </div>
      </article>
    </Link>
  );
}

interface AuthorAvatarRowProps {
  authors: Author[];
  className?: string;
}

export function AuthorAvatarRow({ authors, className }: AuthorAvatarRowProps) {
  return (
    <div className={cn("flex -space-x-2", className)}>
      {authors.slice(0, 5).map((author) => (
        <Link
          key={author.id}
          href={`/author/${author.id}`}
          className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-background hover:z-10 hover:scale-110 transition-transform"
        >
          <Image
            src={author.imageUrl}
            alt={author.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        </Link>
      ))}
      {authors.length > 5 && (
        <div className="relative w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">
            +{authors.length - 5}
          </span>
        </div>
      )}
    </div>
  );
}
