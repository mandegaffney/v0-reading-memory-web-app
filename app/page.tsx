'use client';

import { Header } from '@/components/header';
import { Section, BookGrid, EmptyState } from '@/components/layout';
import { BookCard } from '@/components/book-card';
import { AuthorCard } from '@/components/author-card';
import { usePreferences } from '@/lib/preferences';
import {
  getFavoriteAuthors,
  getUpcomingBooks,
  getPreOrderBooks,
  getRecommendedBooks,
  getOwnedBooks,
} from '@/lib/data';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

export default function HomePage() {
  const { dislikedBookIds, dislikedAuthorIds } = usePreferences();

  const favoriteAuthors = getFavoriteAuthors(dislikedAuthorIds);
  const upcomingBooks = getUpcomingBooks(dislikedBookIds, dislikedAuthorIds);
  const preOrderBooks = getPreOrderBooks(dislikedBookIds, dislikedAuthorIds);
  const recommendedBooks = getRecommendedBooks(dislikedBookIds, dislikedAuthorIds);
  const ownedBooks = getOwnedBooks(dislikedBookIds);

  const newAndUpcoming = [
    ...upcomingBooks,
    ...preOrderBooks.filter(b => !upcomingBooks.includes(b)),
  ].slice(0, 4);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero / Stats */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-tight">
              Your personal
              <br />
              <span className="text-muted-foreground">book collection</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 leading-relaxed">
              {ownedBooks.length} hardcover {ownedBooks.length === 1 ? 'book' : 'books'} from{' '}
              {favoriteAuthors.length} favorite {favoriteAuthors.length === 1 ? 'author' : 'authors'}.
              Never buy duplicates again.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 mt-12">
            <Stat value={ownedBooks.length} label="Books owned" />
            <Stat value={favoriteAuthors.length} label="Favorite authors" />
            <Stat value={upcomingBooks.length + preOrderBooks.length} label="Upcoming releases" />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6">
        {/* Favorite Authors */}
        <Section
          title="Favorite Authors"
          subtitle="Authors you read most"
          action={
            <Link
              href="/authors"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          {favoriteAuthors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteAuthors.slice(0, 6).map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No favorite authors"
              description="Authors you read most will appear here once your library is imported."
            />
          )}
        </Section>

        {/* Upcoming & Pre-orders */}
        {newAndUpcoming.length > 0 && (
          <Section
            title="New Releases"
            subtitle="Coming soon from your favorite authors"
            className="border-t border-border"
          >
            <BookGrid columns={4}>
              {newAndUpcoming.map((book) => (
                <BookCard key={book.id} book={book} showReason />
              ))}
            </BookGrid>
          </Section>
        )}

        {/* Recommendations */}
        {recommendedBooks.length > 0 && (
          <Section
            title="Recommended for You"
            subtitle="Books you don't own yet, from authors you already read"
            className="border-t border-border"
          >
            <BookGrid columns={4}>
              {recommendedBooks.slice(0, 4).map((book) => (
                <BookCard key={book.id} book={book} showReason />
              ))}
            </BookGrid>
          </Section>
        )}

        {/* Recently Added */}
        <Section
          title="Your Library"
          subtitle="Recently purchased hardcovers"
          className="border-t border-border"
          action={
            <Link
              href="/library"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          }
        >
          {ownedBooks.length > 0 ? (
            <BookGrid columns={5}>
              {ownedBooks.slice(0, 10).map((book) => (
                <BookCard key={book.id} book={book} showStatus={false} />
              ))}
            </BookGrid>
          ) : (
            <EmptyState
              title="No books yet"
              description="Connect your Amazon account to import your purchase history."
              action={
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Import from Amazon
                </Link>
              }
            />
          )}
        </Section>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground">
            Reading Memory — Track your hardcover collection
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-3xl md:text-4xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
