'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/layout';
import { usePreferences } from '@/lib/preferences';
import { authors } from '@/lib/data';
import { ArrowLeft, ThumbsDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AuthorsPage() {
  const { dislikedAuthorIds, dislikeAuthor, unDislikeAuthor } = usePreferences();

  const favorites = authors.filter(a => a.isFavorite);
  const others = authors.filter(a => !a.isFavorite);

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <PageHeader
        title="Authors"
        subtitle={`${authors.length} authors in your collection`}
      />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {favorites.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-tight mb-8">Favorite Authors</h2>
            <AuthorList
              authors={favorites}
              dislikedAuthorIds={dislikedAuthorIds}
              onDislike={dislikeAuthor}
              onUnDislike={unDislikeAuthor}
            />
          </section>
        )}

        {others.length > 0 && (
          <section className="border-t border-border pt-16">
            <h2 className="font-serif text-2xl font-semibold tracking-tight mb-8">Also in Your Collection</h2>
            <AuthorList
              authors={others}
              dislikedAuthorIds={dislikedAuthorIds}
              onDislike={dislikeAuthor}
              onUnDislike={unDislikeAuthor}
            />
          </section>
        )}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground">Reading Memory — Track your hardcover collection</p>
        </div>
      </footer>
    </div>
  );
}

function AuthorList({
  authors,
  dislikedAuthorIds,
  onDislike,
  onUnDislike,
}: {
  authors: { id: string; name: string; bio: string; imageUrl: string; booksOwned: number }[];
  dislikedAuthorIds: string[];
  onDislike: (id: string) => void;
  onUnDislike: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-border">
      {authors.map(author => {
        const isDisliked = dislikedAuthorIds.includes(author.id);
        return (
          <div
            key={author.id}
            className={cn(
              'flex items-center gap-6 py-6',
              isDisliked && 'opacity-50'
            )}
          >
            <Link href={`/author/${author.id}`} className="shrink-0">
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted">
                <Image
                  src={author.imageUrl}
                  alt={author.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/author/${author.id}`} className="hover:text-accent transition-colors">
                <h3 className="font-serif font-medium text-base truncate">{author.name}</h3>
              </Link>
              <p className="text-sm text-muted-foreground">
                {author.booksOwned} {author.booksOwned === 1 ? 'book' : 'books'} owned
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => isDisliked ? onUnDislike(author.id) : onDislike(author.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {isDisliked ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Hidden
                </>
              ) : (
                <>
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Hide
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
