'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/layout';
import { AuthorAvatar } from '@/components/author-avatar';
import { usePreferences } from '@/lib/preferences';
import { useAuthorPhotos } from '@/lib/use-author-photos';
import { authors } from '@/lib/data';
import { ArrowLeft, ThumbsDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AuthorsPage() {
  const { dislikedAuthorIds, dislikeAuthor, unDislikeAuthor, importedAuthorNames } = usePreferences();

  const hasImport      = importedAuthorNames.length > 0;
  const staticFavorites = authors.filter(a => a.isFavorite);
  const staticOthers    = authors.filter(a => !a.isFavorite);

  // Imported names that don't overlap with known static authors
  const knownNamesLower  = new Set(authors.map(a => a.name.toLowerCase()));
  const importedOnlyNames = importedAuthorNames.filter(
    name => !knownNamesLower.has(name.toLowerCase())
  );

  // Fetch Open Library photos for imported-only authors
  const { photos: importedPhotos, isLoading: photosLoading } = useAuthorPhotos(importedOnlyNames);

  const totalAuthors = hasImport ? importedAuthorNames.length : authors.length;

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
        subtitle={`${totalAuthors} ${totalAuthors === 1 ? 'author' : 'authors'} in your collection`}
      />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">

        {/* ── Favorites ── */}
        {(hasImport ? importedOnlyNames.length > 0 || staticFavorites.length > 0 : staticFavorites.length > 0) && (
          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-tight mb-8">Favorite Authors</h2>

            {/* Imported-only authors: photos from Open Library + link to library filter */}
            {hasImport && importedOnlyNames.length > 0 && (
              <div className={staticFavorites.length > 0 ? 'mb-2' : ''}>
                {importedOnlyNames.map((name, i) => (
                  <Link
                    key={i}
                    href={`/library?author=${encodeURIComponent(name)}`}
                    className="group flex items-center gap-6 py-5 border-t border-border first:border-t-0 hover:bg-muted/30 -mx-4 px-4 rounded-sm transition-colors"
                  >
                    <AuthorAvatar
                      name={name}
                      photoUrl={importedPhotos.get(name) ?? null}
                      isLoading={photosLoading}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-medium text-base truncate group-hover:text-accent transition-colors">
                        {name}
                      </p>
                      <p className="text-sm text-muted-foreground">Browse in Library →</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Static favorites with full details */}
            {staticFavorites.length > 0 && (
              <AuthorList
                authors={staticFavorites}
                dislikedAuthorIds={dislikedAuthorIds}
                onDislike={dislikeAuthor}
                onUnDislike={unDislikeAuthor}
                topBorder={hasImport && importedOnlyNames.length > 0}
              />
            )}
          </section>
        )}

        {/* ── Also in Your Collection ── */}
        {staticOthers.length > 0 && (
          <section className="border-t border-border pt-16">
            <h2 className="font-serif text-2xl font-semibold tracking-tight mb-8">Also in Your Collection</h2>
            <AuthorList
              authors={staticOthers}
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
  topBorder = false,
}: {
  authors: { id: string; name: string; bio: string; imageUrl: string; booksOwned: number }[];
  dislikedAuthorIds: string[];
  onDislike: (id: string) => void;
  onUnDislike: (id: string) => void;
  topBorder?: boolean;
}) {
  return (
    <div className={cn('divide-y divide-border', topBorder && 'border-t border-border')}>
      {authors.map(author => {
        const isDisliked = dislikedAuthorIds.includes(author.id);
        return (
          <div
            key={author.id}
            className={cn('flex items-center gap-6 py-6', isDisliked && 'opacity-50')}
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
                <><Check className="w-4 h-4 mr-2" />Hidden</>
              ) : (
                <><ThumbsDown className="w-4 h-4 mr-2" />Hide</>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
