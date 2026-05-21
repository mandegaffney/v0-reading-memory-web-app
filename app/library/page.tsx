'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { PageHeader, BookGrid } from '@/components/layout';
import { BookCard } from '@/components/book-card';
import { usePreferences } from '@/lib/preferences';
import { getOwnedBooks } from '@/lib/data';
import { ArrowLeft, Search } from 'lucide-react';

export default function LibraryPage() {
  const { dislikedBookIds } = usePreferences();
  const [query, setQuery] = useState('');

  const allOwned = getOwnedBooks(dislikedBookIds);
  const filtered = query.trim()
    ? allOwned.filter(b =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        b.authorName.toLowerCase().includes(query.toLowerCase())
      )
    : allOwned;

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
        title="Your Library"
        subtitle={`${allOwned.length} hardcover ${allOwned.length === 1 ? 'book' : 'books'} from Amazon`}
      />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Search */}
        <div className="relative max-w-sm mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title or author"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {filtered.length > 0 ? (
          <BookGrid columns={5}>
            {filtered.map(book => (
              <BookCard key={book.id} book={book} showStatus={false} />
            ))}
          </BookGrid>
        ) : (
          <div className="text-center py-16">
            {query ? (
              <p className="text-muted-foreground">No books matching &ldquo;{query}&rdquo;</p>
            ) : (
              <p className="text-muted-foreground">
                Your library is empty.{' '}
                <Link href="/settings" className="underline underline-offset-4 hover:text-foreground transition-colors">
                  Import from Amazon
                </Link>{' '}
                to get started.
              </p>
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
