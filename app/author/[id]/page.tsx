'use client';

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { use } from 'react';
import { Header } from '@/components/header';
import { Section, BookGrid } from '@/components/layout';
import { BookCard } from '@/components/book-card';
import { AuthorCard } from '@/components/author-card';
import { usePreferences } from '@/lib/preferences';
import {
  getAuthorById,
  getBooksByAuthor,
  getRelatedAuthors,
} from '@/lib/data';
import { ArrowLeft, ThumbsDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { dislikedBookIds, dislikedAuthorIds, dislikeAuthor, unDislikeAuthor } = usePreferences();

  const author = getAuthorById(id);

  if (!author) notFound();

  const isDisliked = dislikedAuthorIds.includes(author.id);
  const authorBooks = getBooksByAuthor(author.id, dislikedBookIds);
  const ownedBooks = authorBooks.filter(b => b.isOwned);
  const upcomingBooks = authorBooks.filter(b => b.isUpcoming || b.isPreOrder);
  const otherBooks = authorBooks.filter(b => !b.isOwned && !b.isUpcoming && !b.isPreOrder);
  const relatedAuthors = getRelatedAuthors(author.id, dislikedAuthorIds);

  const handleDislike = () => {
    if (isDisliked) unDislikeAuthor(author.id);
    else dislikeAuthor(author.id);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>
      </div>

      {/* Author Header */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full overflow-hidden bg-muted">
            <Image
              src={author.imageUrl}
              alt={author.name}
              fill
              className="object-cover"
              sizes="160px"
              priority
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">
                  {author.name}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {author.booksOwned} {author.booksOwned === 1 ? 'book' : 'books'} in your collection
                </p>
              </div>
              <Button
                variant={isDisliked ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleDislike}
                className="shrink-0"
              >
                {isDisliked ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Hidden from recommendations
                  </>
                ) : (
                  <>
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Hide from recommendations
                  </>
                )}
              </Button>
            </div>
            <p className="text-foreground/80 mt-6 leading-relaxed max-w-2xl">{author.bio}</p>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6">
        {ownedBooks.length > 0 && (
          <Section
            title="In Your Library"
            subtitle={`${ownedBooks.length} ${ownedBooks.length === 1 ? 'book' : 'books'} owned`}
          >
            <BookGrid columns={4}>
              {ownedBooks.map((book) => (
                <BookCard key={book.id} book={book} showStatus={false} />
              ))}
            </BookGrid>
          </Section>
        )}

        {upcomingBooks.length > 0 && (
          <Section
            title="Upcoming Releases"
            subtitle="New books from this author"
            className="border-t border-border"
          >
            <BookGrid columns={4}>
              {upcomingBooks.map((book) => (
                <BookCard key={book.id} book={book} showReason />
              ))}
            </BookGrid>
          </Section>
        )}

        {otherBooks.length > 0 && (
          <Section
            title="Also by This Author"
            subtitle="Books not yet in your collection"
            className="border-t border-border"
          >
            <BookGrid columns={4}>
              {otherBooks.map((book) => (
                <BookCard key={book.id} book={book} showReason />
              ))}
            </BookGrid>
          </Section>
        )}

        {relatedAuthors.length > 0 && (
          <Section
            title="Similar Authors"
            subtitle="Based on genre and style"
            className="border-t border-border"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedAuthors.map((related) => (
                <AuthorCard key={related.id} author={related} />
              ))}
            </div>
          </Section>
        )}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground">The Stack — Track your hardcover collection</p>
        </div>
      </footer>
    </div>
  );
}
