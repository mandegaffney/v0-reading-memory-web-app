'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/layout';
import { usePreferences } from '@/lib/preferences';
import { getDislikedBooks, getDislikedAuthors } from '@/lib/data';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DislikedPage() {
  const { dislikedBookIds, dislikedAuthorIds, unDislikeBook, unDislikeAuthor } = usePreferences();

  const dislikedBooks = getDislikedBooks(dislikedBookIds);
  const dislikedAuthors = getDislikedAuthors(dislikedAuthorIds);
  const hasAnything = dislikedBooks.length > 0 || dislikedAuthors.length > 0;

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
        title="Hidden from Recommendations"
        subtitle="Books and authors you've marked as not interested. Restore any to bring them back."
      />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!hasAnything ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground">Nothing hidden yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Use &ldquo;Not interested&rdquo; or &ldquo;Hide from recommendations&rdquo; on any book or author page.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {dislikedAuthors.length > 0 && (
              <section>
                <h2 className="font-serif text-2xl font-semibold tracking-tight mb-8">
                  Hidden Authors
                </h2>
                <div className="divide-y divide-border">
                  {dislikedAuthors.map(author => (
                    <div key={author.id} className="flex items-center gap-6 py-6">
                      <Link href={`/author/${author.id}`} className="shrink-0">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                          <Image
                            src={author.imageUrl}
                            alt={author.name}
                            fill
                            className="object-cover grayscale"
                            sizes="48px"
                          />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/author/${author.id}`} className="hover:text-accent transition-colors">
                          <h3 className="font-serif font-medium truncate">{author.name}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {author.booksOwned} {author.booksOwned === 1 ? 'book' : 'books'} owned
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unDislikeAuthor(author.id)}
                        className="shrink-0"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {dislikedBooks.length > 0 && (
              <section className={dislikedAuthors.length > 0 ? 'border-t border-border pt-16' : ''}>
                <h2 className="font-serif text-2xl font-semibold tracking-tight mb-8">
                  Hidden Books
                </h2>
                <div className="divide-y divide-border">
                  {dislikedBooks.map(book => (
                    <div key={book.id} className="flex items-center gap-6 py-6">
                      <Link href={`/book/${book.id}`} className="shrink-0">
                        <div className="relative w-10 h-14 rounded-sm overflow-hidden bg-muted">
                          <Image
                            src={book.coverUrl}
                            alt={book.title}
                            fill
                            className="object-cover grayscale"
                            sizes="40px"
                          />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/book/${book.id}`} className="hover:text-accent transition-colors">
                          <h3 className="font-serif font-medium leading-tight line-clamp-1">{book.title}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">{book.authorName}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unDislikeBook(book.id)}
                        className="shrink-0"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
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
