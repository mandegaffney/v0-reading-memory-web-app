'use client';

import Link from 'next/link';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/layout';
import { usePreferences } from '@/lib/preferences';
import { ArrowLeft, RotateCcw, BookOpen, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function HiddenPage() {
  const { hiddenBooks, hiddenAuthors, unhideBook, unhideAuthor } = usePreferences();
  const hasAnything = hiddenBooks.length > 0 || hiddenAuthors.length > 0;

  async function handleUnhideBook(id: string, title: string) {
    try {
      await unhideBook(id);
      toast.success(`"${title}" restored to recommendations.`);
    } catch {
      toast.error('Failed to unhide. Try again.');
    }
  }

  async function handleUnhideAuthor(id: string, name: string) {
    try {
      await unhideAuthor(id);
      toast.success(`${name} restored to recommendations.`);
    } catch {
      toast.error('Failed to unhide. Try again.');
    }
  }

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
        title="Hidden"
        subtitle="Books and authors suppressed from all recommendations. Restore any to bring them back."
      />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!hasAnything ? (
          <div className="text-center py-24 space-y-2">
            <p className="text-muted-foreground">Nothing hidden yet.</p>
            <p className="text-sm text-muted-foreground">
              Use &ldquo;Not interested&rdquo; on any recommendation card, or the hide icon on author cards.
            </p>
          </div>
        ) : (
          <div className="space-y-16">

            {/* ── Hidden Authors ── */}
            {hiddenAuthors.length > 0 && (
              <section>
                <h2 className="font-serif text-3xl font-semibold tracking-tight mb-8">
                  Hidden authors
                </h2>
                <div className="divide-y divide-border">
                  {hiddenAuthors.map(author => (
                    <div key={author.id} className="flex items-center gap-4 py-4">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="font-serif font-medium flex-1 min-w-0 truncate">{author.name}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnhideAuthor(author.id, author.name)}
                        className="shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Hidden Books ── */}
            {hiddenBooks.length > 0 && (
              <section className={hiddenAuthors.length > 0 ? 'border-t border-border pt-16' : ''}>
                <h2 className="font-serif text-3xl font-semibold tracking-tight mb-8">
                  Hidden books
                </h2>
                <div className="divide-y divide-border">
                  {hiddenBooks.map(book => (
                    <div key={book.id} className="flex items-center gap-4 py-4">
                      <div className="w-8 h-10 bg-muted flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <p className="font-serif font-medium flex-1 min-w-0 leading-snug line-clamp-1">
                        {book.title}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnhideBook(book.id, book.title)}
                        className="shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
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
          <p className="text-sm text-muted-foreground">The Stack — Track your hardcover collection</p>
        </div>
      </footer>
    </div>
  );
}
