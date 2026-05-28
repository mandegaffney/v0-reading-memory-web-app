'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { use } from 'react';
import { Header } from '@/components/header';
import { Section, BookGrid } from '@/components/layout';
import { BookCard } from '@/components/book-card';
import { usePreferences } from '@/lib/preferences';
import { ladybirdSearchUrl } from '@/lib/use-author-books';
import {
  getBookById,
  getAuthorById,
  getBooksByAuthor,
} from '@/lib/data';
import {
  ArrowLeft,
  ThumbsDown,
  Check,
  ShoppingCart,
  Calendar,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { dislikedBookIds, dislikeBook, unDislikeBook } = usePreferences();
  const [showPurchaseWarning, setShowPurchaseWarning] = useState(false);

  const book = getBookById(id);

  if (!book) notFound();

  const isDisliked = dislikedBookIds.includes(book.id);
  const author = getAuthorById(book.authorId);
  const otherAuthorBooks = getBooksByAuthor(book.authorId, dislikedBookIds)
    .filter(b => b.id !== book.id)
    .slice(0, 4);

  const handleDislike = () => {
    if (isDisliked) unDislikeBook(book.id);
    else dislikeBook(book.id);
  };

  const handlePurchase = () => {
    if (book.isOwned) {
      setShowPurchaseWarning(true);
    } else {
      window.open(ladybirdSearchUrl(book.title, book.authorName), '_blank', 'noopener,noreferrer');
    }
  };

  const publishDate = new Date(book.publishDate);
  const isUpcoming = publishDate > new Date();

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

      {/* Book Header */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Cover */}
          <div className="relative w-48 md:w-64 shrink-0">
            <div className="relative aspect-[2/3] bg-muted rounded-sm overflow-hidden shadow-lg">
              <Image
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                fill
                className="object-cover"
                sizes="256px"
                priority
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 py-2">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="font-normal">
                <BookOpen className="w-3 h-3 mr-1" />
                Hardcover
              </Badge>
              {book.isOwned && (
                <Badge variant="secondary" className="font-normal bg-accent/10 text-accent border-accent/20">
                  <Check className="w-3 h-3 mr-1" />
                  In Your Library
                </Badge>
              )}
              {book.isPreOrder && (
                <Badge variant="secondary" className="font-normal">
                  <Calendar className="w-3 h-3 mr-1" />
                  Pre-order
                </Badge>
              )}
            </div>

            <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              {book.title}
            </h1>

            <Link
              href={`/author/${book.authorId}`}
              className="text-lg text-muted-foreground hover:text-foreground transition-colors mt-2 block"
            >
              by {book.authorName}
            </Link>

            <div className="flex flex-wrap gap-2 mt-4">
              {book.genres.map((genre) => (
                <span
                  key={genre}
                  className="text-xs text-muted-foreground border border-border rounded-sm px-2 py-1"
                >
                  {genre}
                </span>
              ))}
            </div>

            <p className="text-foreground/80 mt-6 leading-relaxed max-w-xl">{book.description}</p>

            {book.whyRecommended && !book.isOwned && (
              <div className="mt-6 p-4 bg-secondary/50 rounded-sm border border-border">
                <p className="text-sm text-muted-foreground italic">{book.whyRecommended}</p>
              </div>
            )}

            {/* Duplicate / owned warning — shown before any purchase attempt */}
            {(book.isOwned || showPurchaseWarning) && (
              <div className="mt-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-sm p-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">You already own this book</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This hardcover is already in your library. No need to purchase again.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              {!book.isOwned && (
                <Button size="lg" onClick={handlePurchase} className="font-medium">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {book.isPreOrder ? 'Pre-order' : 'Buy'} — ${book.price.toFixed(2)}
                </Button>
              )}

              <Button
                variant={isDisliked ? 'secondary' : 'outline'}
                size="lg"
                onClick={handleDislike}
              >
                {isDisliked ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Hidden
                  </>
                ) : (
                  <>
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Not interested
                  </>
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              {isUpcoming
                ? `Releases ${publishDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : `Published ${publishDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6">
        {otherAuthorBooks.length > 0 && (
          <Section title={`More from ${book.authorName}`} className="border-t border-border">
            <BookGrid columns={4}>
              {otherAuthorBooks.map((otherBook) => (
                <BookCard key={otherBook.id} book={otherBook} />
              ))}
            </BookGrid>
          </Section>
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
