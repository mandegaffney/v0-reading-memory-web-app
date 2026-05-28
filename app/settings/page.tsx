'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/layout';
import { usePreferences } from '@/lib/preferences';
import type { ImportedBook } from '@/lib/preferences';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  BookOpen,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CsvRow {
  'Product Name'?: string;
  'Author'?: string;
  'Genre'?: string;
  'Order Date'?: string;
  'Unit Price'?: string;
  'Total Amount'?: string;
  'Order Status'?: string;
  'Order ID'?: string;
  [key: string]: string | undefined;
}

export default function SettingsPage() {
  const { importedBooks, importedAuthorNames, replaceImportedBooks, clearImportedBooks } =
    usePreferences();

  const [isDragging, setIsDragging]     = useState(false);
  const [isParsing, setIsParsing]       = useState(false);
  const [parseError, setParseError]     = useState<string | null>(null);
  // Confirmation dialog state — holds the file waiting to be confirmed
  const [pendingFile, setPendingFile]   = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Core parse + replace ─────────────────────────────────────────────────
  // Called only after the user confirms (or immediately if the library is empty).
  // On any parse failure the existing data is left intact.
  const runParse = useCallback(
    (file: File) => {
      setIsParsing(true);
      setParseError(null);

      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete(results) {
          setIsParsing(false);
          if (inputRef.current) inputRef.current.value = '';

          // Parse failure — abort; do not touch existing data
          if (results.errors.length && !results.data.length) {
            setParseError('Could not read the file. Make sure it is a valid CSV.');
            return;
          }

          // Map CSV rows → ImportedBook (all eight fields)
          const books: ImportedBook[] = results.data
            .map(row => ({
              title:       (row['Product Name']  ?? '').trim(),
              author:      (row['Author']        ?? '').trim(),
              genre:       (row['Genre']         ?? '').trim(),
              dateOrdered: (row['Order Date']    ?? '').trim(),
              unitPrice:   (row['Unit Price']    ?? '').trim(),
              totalAmount: (row['Total Amount']  ?? '').trim(),
              orderStatus: (row['Order Status']  ?? '').trim(),
              orderId:     (row['Order ID']      ?? '').trim(),
            }))
            .filter(b => b.title.length > 0);

          // Empty result — abort; do not touch existing data
          if (!books.length) {
            setParseError(
              'No books found. Make sure your CSV has a "Product Name" column with values.'
            );
            return;
          }

          // Replace the entire in-memory library.
          // user-configured state (dislikedBookIds, dislikedAuthorIds) is preserved automatically —
          // replaceImportedBooks only touches importedBooks and importedAuthorNames.
          const { newBooks, newAuthors } = replaceImportedBooks(books);

          toast.success(
            `Library updated — ${newBooks} ${newBooks === 1 ? 'book' : 'books'} and ` +
            `${newAuthors} ${newAuthors === 1 ? 'author' : 'authors'} loaded.`
          );
        },
        error(err) {
          // Parse error — abort; do not touch existing data
          setIsParsing(false);
          setParseError(err.message ?? 'Unknown parse error.');
          if (inputRef.current) inputRef.current.value = '';
        },
      });
    },
    [replaceImportedBooks]
  );

  // ── File intake ──────────────────────────────────────────────────────────
  // If a library already exists, gate behind a confirmation dialog.
  // If the library is empty, parse immediately.
  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv')) {
        setParseError('Please select a .csv file.');
        return;
      }
      setParseError(null);

      if (importedBooks.length > 0) {
        // Hold the file and show the confirmation dialog
        setPendingFile(file);
      } else {
        runParse(file);
      }
    },
    [importedBooks.length, runParse]
  );

  // ── Confirmation handlers ────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);   // close dialog
    runParse(file);
  }, [pendingFile, runParse]);

  const handleCancel = useCallback(() => {
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  // ── Drag / file-input handlers ───────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const hasLibrary = importedBooks.length > 0;

  return (
    <div className="min-h-screen">
      <Header />

      {/* ── Confirmation dialog ───────────────────────────────────────────── */}
      <Dialog open={!!pendingFile} onOpenChange={open => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replace your library?</DialogTitle>
            <DialogDescription>
              Importing a new CSV will replace your current library (
              {importedBooks.length} {importedBooks.length === 1 ? 'book' : 'books'}
              {importedAuthorNames.length > 0
                ? `, ${importedAuthorNames.length} ${importedAuthorNames.length === 1 ? 'author' : 'authors'}`
                : ''}
              ) with the new file's data. Your Hidden books and authors will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isParsing}>
              {isParsing ? 'Importing…' : 'Import & Replace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>
      </div>

      <PageHeader
        title="Import CSV"
        subtitle="Upload a CSV file to replace your library and author list with fresh data."
      />

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-2xl space-y-10">

          {/* ── Drop zone ─────────────────────────────────────────────────── */}
          <section>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isParsing && inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-sm p-12 text-center transition-colors select-none',
                isParsing ? 'opacity-60 cursor-wait' : 'cursor-pointer',
                isDragging
                  ? 'border-foreground bg-muted/60'
                  : 'border-border hover:border-foreground/40 hover:bg-muted/30'
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {hasLibrary ? (
                <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
              )}
              <p className="font-medium">
                {isParsing
                  ? 'Reading file…'
                  : hasLibrary
                  ? 'Drop a new CSV to replace your library, or click to browse'
                  : 'Drop your CSV here, or click to browse'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Columns used:{' '}
                <span className="font-mono text-xs">
                  Product Name · Author · Genre · Order Date · Unit Price · Total Amount · Order Status · Order ID
                </span>
              </p>
            </div>

            {/* Inline error — shown without replacing existing data */}
            {parseError && (
              <div className="flex items-start gap-3 mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-sm">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{parseError}</p>
              </div>
            )}
          </section>

          {/* ── Current import status ─────────────────────────────────────── */}
          {hasLibrary && (
            <section className="border border-border rounded-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {importedBooks.length}{' '}
                      {importedBooks.length === 1 ? 'book' : 'books'} loaded
                    </p>
                    {importedAuthorNames.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {importedAuthorNames.length}{' '}
                        {importedAuthorNames.length === 1 ? 'author' : 'authors'} in your collection
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    clearImportedBooks();
                    toast.success('Library cleared.');
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>

              {/* Book preview */}
              <div className="mt-6 pt-6 border-t border-border space-y-2">
                {importedBooks.slice(0, 8).map((book, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{book.title}</span>
                    {book.author && (
                      <span className="text-muted-foreground shrink-0 truncate max-w-[140px]">
                        {book.author}
                      </span>
                    )}
                    {book.unitPrice && (
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">
                        {book.unitPrice}
                      </span>
                    )}
                  </div>
                ))}
                {importedBooks.length > 8 && (
                  <p className="text-xs text-muted-foreground pl-6">
                    +{importedBooks.length - 8} more —{' '}
                    <Link
                      href="/library"
                      className="underline underline-offset-4 hover:text-foreground transition-colors"
                    >
                      view all in Library
                    </Link>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Expected columns ──────────────────────────────────────────── */}
          <section className="border-t border-border pt-10">
            <h3 className="font-serif text-lg font-semibold mb-4">Expected CSV format</h3>
            <div className="overflow-x-auto">
              <table className="text-sm w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-6 font-medium text-muted-foreground">Column</th>
                    <th className="text-left py-2 pr-6 font-medium text-muted-foreground">Maps to</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { col: 'Product Name', maps: 'title',       req: 'Yes' },
                    { col: 'Author',       maps: 'author',      req: 'No'  },
                    { col: 'Genre',        maps: 'genre',       req: 'No'  },
                    { col: 'Order Date',   maps: 'dateOrdered', req: 'No'  },
                    { col: 'Unit Price',   maps: 'unitPrice',   req: 'No'  },
                    { col: 'Total Amount', maps: 'totalAmount', req: 'No'  },
                    { col: 'Order Status', maps: 'orderStatus', req: 'No'  },
                    { col: 'Order ID',     maps: 'orderId',     req: 'No'  },
                  ].map(({ col, maps, req }) => (
                    <tr key={col}>
                      <td className="py-2.5 pr-6 font-mono text-xs">{col}</td>
                      <td className="py-2.5 pr-6 text-muted-foreground">{maps}</td>
                      <td className="py-2.5 text-muted-foreground">{req}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Extra columns are ignored. Rows without a title are skipped. Each upload
              replaces the current library — your Hidden list is never affected.
            </p>
          </section>

        </div>
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
