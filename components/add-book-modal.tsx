'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/lib/preferences';
import { searchByISBN, searchByText, type GoogleBook } from '@/lib/google-books';
import { Camera, ScanBarcode, BookOpen, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// ── State machine ─────────────────────────────────────────────────────────────

type Step =
  | { type: 'choose' }
  | { type: 'processing'; label: string }
  | { type: 'results';    books: GoogleBook[] }
  | { type: 'confirm';    book: GoogleBook }
  | { type: 'manual';     prefill?: { title?: string; author?: string } }
  | { type: 'saving' }
  | { type: 'done';       title: string };

// ── Scanning helpers (loaded lazily so they don't bloat the initial bundle) ──

async function decodeBarcode(file: File): Promise<string | null> {
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();
    const url    = URL.createObjectURL(file);
    try {
      const result = await (reader as { decodeFromImageUrl(url: string): Promise<{ getText(): string }> })
        .decodeFromImageUrl(url);
      return result.getText();
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

async function ocrImage(file: File): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', undefined, {
    workerPath:  'https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/worker.min.js',
    langPath:    'https://tessdata.projectnaptha.com/4.0.0_fast',
    corePath:    'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
    logger:      () => {},
    errorHandler: () => {},
  });
  try {
    const { data: { text } } = await worker.recognize(file);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
}

export function AddBookModal({ open, onOpenChange }: Props) {
  const { addBook } = usePreferences();
  const [step, setStep] = useState<Step>({ type: 'choose' });
  const barcodeRef = useRef<HTMLInputElement>(null);
  const coverRef   = useRef<HTMLInputElement>(null);

  // Manual form state
  const [manualTitle,  setManualTitle]  = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualGenre,  setManualGenre]  = useState('');

  function reset() {
    setStep({ type: 'choose' });
    setManualTitle('');
    setManualAuthor('');
    setManualGenre('');
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  // ── Barcode flow ────────────────────────────────────────────────────────────

  async function handleBarcodeFile(file: File) {
    setStep({ type: 'processing', label: 'Reading barcode…' });
    const code = await decodeBarcode(file);
    if (!code) {
      toast.error('Could not read a barcode from that image. Try a clearer photo.');
      setStep({ type: 'choose' });
      return;
    }
    setStep({ type: 'processing', label: `Searching for ISBN ${code}…` });
    const book = await searchByISBN(code);
    if (book) {
      setStep({ type: 'confirm', book });
    } else {
      toast.error('No book found for that ISBN. Enter details manually.');
      setStep({ type: 'manual' });
    }
  }

  // ── Cover / OCR flow ────────────────────────────────────────────────────────

  async function handleCoverFile(file: File) {
    setStep({ type: 'processing', label: 'Reading cover text (this takes a few seconds)…' });
    let text = '';
    try {
      text = await ocrImage(file);
    } catch {
      toast.error('OCR failed. Enter details manually.');
      setStep({ type: 'manual' });
      return;
    }

    const query = text.split('\n').slice(0, 5).join(' ').replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!query) {
      toast.error('Could not read any text from the image. Enter details manually.');
      setStep({ type: 'manual' });
      return;
    }

    setStep({ type: 'processing', label: 'Searching Google Books…' });
    const books = await searchByText(query);
    if (books.length === 0) {
      toast.error('No books matched. Enter details manually.');
      setStep({ type: 'manual', prefill: { title: query.slice(0, 60) } });
    } else if (books.length === 1) {
      setStep({ type: 'confirm', book: books[0] });
    } else {
      setStep({ type: 'results', books });
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function saveBook(book: GoogleBook) {
    setStep({ type: 'saving' });
    try {
      await addBook({
        title:       book.title,
        author:      book.authors[0] ?? '',
        genre:       '',
        dateOrdered: '',
        unitPrice:   '',
        totalAmount: '',
        orderStatus: '',
        orderId:     '',
      });
      setStep({ type: 'done', title: book.title });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save book.');
      setStep({ type: 'confirm', book });
    }
  }

  async function saveManual() {
    if (!manualTitle.trim()) return;
    setStep({ type: 'saving' });
    try {
      await addBook({
        title:       manualTitle.trim(),
        author:      manualAuthor.trim(),
        genre:       manualGenre.trim(),
        dateOrdered: '',
        unitPrice:   '',
        totalAmount: '',
        orderStatus: '',
        orderId:     '',
      });
      setStep({ type: 'done', title: manualTitle.trim() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save book.');
      setStep({ type: 'manual' });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Add a Book</DialogTitle>
        </DialogHeader>

        {/* ── Step: choose ── */}
        {step.type === 'choose' && (
          <div className="space-y-3 pt-2">
            {/* Barcode */}
            <button
              onClick={() => barcodeRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-sm hover:bg-muted/50 hover:border-foreground/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Scan Barcode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Photo or upload of the book's back-cover barcode
                </p>
              </div>
            </button>
            <input
              ref={barcodeRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBarcodeFile(f); e.target.value = ''; }}
            />

            {/* Cover photo / OCR */}
            <button
              onClick={() => coverRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-sm hover:bg-muted/50 hover:border-foreground/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Take Cover Photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  OCR reads the title text and searches Google Books
                </p>
              </div>
            </button>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = ''; }}
            />

            {/* Manual */}
            <button
              onClick={() => setStep({ type: 'manual' })}
              className="w-full flex items-center gap-4 p-4 border border-border rounded-sm hover:bg-muted/50 hover:border-foreground/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Enter Manually</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Type title, author, and genre directly
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ── Step: processing ── */}
        {step.type === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">{step.label}</p>
          </div>
        )}

        {/* ── Step: results (multiple matches from OCR search) ── */}
        {step.type === 'results' && (
          <div className="space-y-3 pt-2 max-h-96 overflow-y-auto">
            <p className="text-sm text-muted-foreground">Select the correct book:</p>
            {step.books.map(book => (
              <button
                key={book.id}
                onClick={() => setStep({ type: 'confirm', book })}
                className="w-full flex items-center gap-3 p-3 border border-border rounded-sm hover:bg-muted/50 hover:border-foreground/30 transition-colors text-left"
              >
                {book.coverUrl ? (
                  <div className="relative w-10 h-14 shrink-0 overflow-hidden rounded-sm bg-muted">
                    <Image src={book.coverUrl} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                ) : (
                  <div className="w-10 h-14 shrink-0 bg-muted rounded-sm flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{book.title}</p>
                  {book.authors[0] && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{book.authors[0]}</p>
                  )}
                </div>
              </button>
            ))}
            <Button variant="outline" className="w-full mt-2" onClick={() => setStep({ type: 'manual' })}>
              None of these — enter manually
            </Button>
          </div>
        )}

        {/* ── Step: confirm ── */}
        {step.type === 'confirm' && (
          <div className="pt-2 space-y-5">
            <div className="flex gap-4">
              {step.book.coverUrl ? (
                <div className="relative w-20 h-28 shrink-0 overflow-hidden rounded-sm bg-muted">
                  <Image src={step.book.coverUrl} alt="" fill className="object-cover" sizes="80px" />
                </div>
              ) : (
                <div className="w-20 h-28 shrink-0 bg-muted rounded-sm flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-serif font-semibold leading-snug">{step.book.title}</p>
                {step.book.authors[0] && (
                  <p className="text-sm text-muted-foreground mt-1">{step.book.authors[0]}</p>
                )}
                {step.book.isbn && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{step.book.isbn}</p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Add this book to your library?</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => saveBook(step.book)}>
                Add to Library
              </Button>
              <Button variant="outline" onClick={() => setStep({ type: 'choose' })}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: manual entry ── */}
        {step.type === 'manual' && (
          <div className="pt-2 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
              <input
                autoFocus
                value={manualTitle || step.prefill?.title || ''}
                onChange={e => setManualTitle(e.target.value)}
                onFocus={e => { if (!manualTitle && step.prefill?.title) setManualTitle(step.prefill.title); e.target.select(); }}
                placeholder="Book title"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Author</label>
              <input
                value={manualAuthor || step.prefill?.author || ''}
                onChange={e => setManualAuthor(e.target.value)}
                onFocus={e => { if (!manualAuthor && step.prefill?.author) setManualAuthor(step.prefill.author); }}
                placeholder="Author name"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Genre</label>
              <input
                value={manualGenre}
                onChange={e => setManualGenre(e.target.value)}
                placeholder="e.g. Thriller, Literary Fiction"
                className="w-full px-3 py-2 text-sm border border-border rounded-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Search Google Books if title is filled */}
            {manualTitle.trim() && (
              <button
                onClick={async () => {
                  setStep({ type: 'processing', label: 'Searching Google Books…' });
                  const books = await searchByText(manualTitle.trim());
                  if (books.length === 0) {
                    toast.error('No results. Fill in details manually.');
                    setStep({ type: 'manual', prefill: { title: manualTitle, author: manualAuthor } });
                  } else if (books.length === 1) {
                    setStep({ type: 'confirm', book: books[0] });
                  } else {
                    setStep({ type: 'results', books });
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                <Search className="w-3 h-3" />
                Search Google Books for &ldquo;{manualTitle.trim().slice(0, 40)}&rdquo;
              </button>
            )}

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" disabled={!manualTitle.trim()} onClick={saveManual}>
                Add to Library
              </Button>
              <Button variant="outline" onClick={() => setStep({ type: 'choose' })}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: saving ── */}
        {step.type === 'saving' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Saving to your library…</p>
          </div>
        )}

        {/* ── Step: done ── */}
        {step.type === 'done' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <div>
              <p className="font-serif font-semibold text-lg">{step.title}</p>
              <p className="text-sm text-muted-foreground mt-1">Added to your library</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={reset}>Add Another</Button>
              <Button variant="outline" onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
