'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PageHeader } from '@/components/layout';
import { AuthorAvatar } from '@/components/author-avatar';
import { usePreferences } from '@/lib/preferences';
import { useAuthorPhotos } from '@/lib/use-author-photos';
import { authors } from '@/lib/data';
import { ArrowLeft, ThumbsDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AuthorsPage() {
  const { dislikedAuthorIds, dislikeAuthor, unDislikeAuthor, importedBooks, importedFavoriteAuthors } = usePreferences();

  const hasImport       = importedBooks.length > 0;
  const staticFavorites = authors.filter(a => a.isFavorite);
  const staticOthers    = authors.filter(a => !a.isFavorite);

  // From the qualified favorites, filter out any that overlap with known static authors
  const knownNamesLower        = new Set(authors.map(a => a.name.toLowerCase()));
  const importedFavoriteOnly   = importedFavoriteAuthors.filter(
    ({ name }) => !knownNamesLower.has(name.toLowerCase())
  );

  // Fetch Open Library photos for those authors
  const { photos: importedPhotos, isLoading: photosLoading } = useAuthorPhotos(
    importedFavoriteOnly.map(a => a.name)
  );

  // Show count of qualified favorites (not raw unique-author count)
  const totalAuthors = hasImport ? importedFavoriteAuthors.length : authors.length;

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
        <section>
          <h2 className="font-serif text-2xl font-normal tracking-tight mb-8">Favorite Authors</h2>

          {hasImport ? (
            importedFavoriteAuthors.length >= 2 ? (
              /* Imported favorites: photos from Open Library + book count + library filter link */
              <div className={staticFavorites.length > 0 ? 'mb-2' : ''}>
                {importedFavoriteOnly.map((author, i) => (
                  <Link
                    key={i}
                    href={`/library?author=${encodeURIComponent(author.name)}`}
                    className="group flex items-center gap-6 py-5 border-t border-border first:border-t-0 hover:bg-muted/30 -mx-4 px-4 rounded-sm transition-colors"
                  >
                    <AuthorAvatar
                      name={author.name}
                      photoUrl={importedPhotos.get(author.name) ?? null}
                      isLoading={photosLoading}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-medium text-base truncate group-hover:text-accent transition-colors">
                        {author.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'} · Browse in Library →
                      </p>
                    </div>
                  </Link>
                ))}

                {/* Static favorites sitting alongside imported ones */}
                {staticFavorites.length > 0 && (
                  <AuthorList
                    authors={staticFavorites}
                    dislikedAuthorIds={dislikedAuthorIds}
                    onDislike={dislikeAuthor}
                    onUnDislike={unDislikeAuthor}
                    topBorder={importedFavoriteOnly.length > 0}
                  />
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Read more books by the same author to build your favorites list.
              </p>
            )
          ) : staticFavorites.length > 0 ? (
            <AuthorList
              authors={staticFavorites}
              dislikedAuthorIds={dislikedAuthorIds}
              onDislike={dislikeAuthor}
              onUnDislike={unDislikeAuthor}
            />
          ) : null}
        </section>

        {/* ── Also in Your Collection ── */}
        {staticOthers.length > 0 && (
          <section className="border-t border-border pt-16">
            <h2 className="font-serif text-2xl font-normal tracking-tight mb-8">Also in Your Collection</h2>
            <AuthorList
              authors={staticOthers}
              dislikedAuthorIds={dislikedAuthorIds}
              onDislike={dislikeAuthor}
              onUnDislike={unDislikeAuthor}
            />
          </section>
        )}

      </main>

      <div className="mt-16">
        <Footer />
      </div>
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
