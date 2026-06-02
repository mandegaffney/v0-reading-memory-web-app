'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/lib/preferences';
import { searchByTitleAuthor, type GoogleBook } from '@/lib/google-books';
import { Mic, Loader2, CheckCircle2, Search, ArrowLeft, MicOff } from 'lucide-react';

// ── State machine ─────────────────────────────────────────────────────────────

type Step =
  | { type: 'form' }
  | { type: 'searching' }
  | { type: 'results'; books: GoogleBook[]; noResults: boolean }
  | { type: 'confirm'; book: GoogleBook }
  | { type: 'editing'; book: GoogleBook; editTitle: string; editAuthor: string }
  | { type: 'saving' }
  | { type: 'done'; title: string };

// ── Speech Recognition ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSR = (): (new () => SpeechRecognition) | null =>
  typeof window === 'undefined'
    ? null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null);

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBookModal({ open, onOpenChange }: Props) {
  const { addBook } = usePreferences();

  // Persistent search inputs and last results — kept across steps so Back works
  const [searchTitle,   setSearchTitle]   = useState('');
  const [searchAuthor,  setSearchAuthor]  = useState('');
  const [lastResults,   setLastResults]   = useState<GoogleBook[]>([]);

  const [step, setStep] = useState<Step>({ type: 'form' });

  // Voice state
  const [listeningFor,    setListeningFor]    = useState<'title' | 'author' | null>(null);
  const [voiceAvailable,  setVoiceAvailable]  = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => { setVoiceAvailable(getSR() !== null); }, []);
  useEffect(() => { if (!open) abort(); }, [open]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function abort() {
    try { recRef.current?.abort(); } catch {}
    recRef.current = null;
    setListeningFor(null);
  }

  function reset() {
    setSearchTitle('');
    setSearchAuthor('');
    setLastResults([]);
    setStep({ type: 'form' });
    setPermissionDenied(false);
    abort();
  }

  function handleClose(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  const canSearch = searchTitle.trim().length > 0 || searchAuthor.trim().length > 0;

  // ── Voice input ───────────────────────────────────────────────────────────

  function startListening(field: 'title' | 'author') {
    abort();
    const SR = getSR();
    if (!SR) { setVoiceAvailable(false); return; }

    let rec: SpeechRecognition;
    try { rec = new SR(); }
    catch { setVoiceAvailable(false); return; }

    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => setListeningFor(field);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0]?.[0]?.transcript?.trim() ?? '';
      if (text) { if (field === 'title') setSearchTitle(text); else setSearchAuthor(text); }
      setListeningFor(null);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListeningFor(null);
      if (e.error === 'not-allowed' || e.error === 'permission-denied') setPermissionDenied(true);
      else if (e.error === 'service-not-allowed' || e.error === 'not-supported') setVoiceAvailable(false);
      else if (e.error !== 'no-speech' && e.error !== 'aborted') toast.error('Voice input failed — type instead.');
    };
    rec.onend = () => setListeningFor(null);
    recRef.current = rec;
    try { rec.start(); } catch { setVoiceAvailable(false); recRef.current = null; }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!canSearch) return;
    abort();
    setStep({ type: 'searching' });
    const books = await searchByTitleAuthor(searchTitle, searchAuthor);
    const trimmed = books.slice(0, 3);
    setLastResults(trimmed);
    setStep({ type: 'results', books: trimmed, noResults: books.length === 0 });
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function saveBook(title: string, author: string) {
    setStep({ type: 'saving' });
    try {
      await addBook({ title, author, genre: '', dateOrdered: '', unitPrice: '', totalAmount: '', orderStatus: '', orderId: '' });
      setStep({ type: 'done', title });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save book.');
      setStep({ type: 'form' });
    }
  }

  const showMic = voiceAvailable === true && !permissionDenied;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-semibold">Add a Book</DialogTitle>
        </DialogHeader>

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        {step.type === 'form' && (
          <div className="pt-2 space-y-5">
            {permissionDenied && (
              <div className="flex items-start gap-2.5 p-3 bg-muted border border-border text-xs">
                <MicOff className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <p>Microphone blocked — click the 🔒 in your address bar, set Microphone to <strong>Allow</strong>, then reload.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="eyebrow">Title</label>
              <div className="relative">
                <input
                  autoFocus
                  value={searchTitle}
                  onChange={e => setSearchTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canSearch && handleSearch()}
                  placeholder="e.g. The Secret History"
                  className="w-full px-3 py-2.5 pr-11 text-sm border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {showMic && (
                  <MicBtn active={listeningFor === 'title'} onToggle={() => listeningFor === 'title' ? abort() : startListening('title')} />
                )}
              </div>
              {listeningFor === 'title' && <Hint field="title" />}
            </div>

            <div className="space-y-2">
              <label className="eyebrow">Author</label>
              <div className="relative">
                <input
                  value={searchAuthor}
                  onChange={e => setSearchAuthor(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canSearch && handleSearch()}
                  placeholder="e.g. Donna Tartt"
                  className="w-full px-3 py-2.5 pr-11 text-sm border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {showMic && (
                  <MicBtn active={listeningFor === 'author'} onToggle={() => listeningFor === 'author' ? abort() : startListening('author')} />
                )}
              </div>
              {listeningFor === 'author' && <Hint field="author" />}
            </div>

            <p className="text-xs text-muted-foreground">Fill in one or both fields, then search.</p>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" disabled={!canSearch} onClick={handleSearch}>
                <Search className="w-3.5 h-3.5" />
                Search
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* ── Searching ────────────────────────────────────────────────────── */}
        {step.type === 'searching' && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Searching…</p>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {step.type === 'results' && (
          <div className="pt-2 space-y-4">
            {step.noResults ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No results found — you can still add this book manually.
                </p>
                <div className="p-4 bg-muted border border-border">
                  <p className="font-serif font-medium leading-snug">
                    {searchTitle || <span className="text-muted-foreground italic">No title</span>}
                  </p>
                  {searchAuthor && <p className="text-xs text-muted-foreground mt-1">{searchAuthor}</p>}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => saveBook(searchTitle.trim() || 'Untitled', searchAuthor.trim())}>
                    Add to Library
                  </Button>
                  <Button variant="outline" onClick={() => setStep({ type: 'form' })}>
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="eyebrow text-muted-foreground">Select the correct book</p>

                {step.books.map(book => (
                  <button
                    key={book.id}
                    onClick={() => setStep({ type: 'confirm', book })}
                    className="w-full flex items-center gap-3 p-3 border border-border hover:bg-muted/50 hover:border-foreground/30 transition-colors text-left"
                  >
                    {/* Cover thumbnail */}
                    <div className="w-10 h-14 shrink-0 bg-muted overflow-hidden">
                      {book.coverUrl
                        ? <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif font-medium text-sm leading-snug line-clamp-2">{book.title}</p>
                      {book.authors[0] && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{book.authors[0]}</p>
                      )}
                      {book.publishYear && (
                        <p className="text-xs text-muted-foreground mt-0.5">{book.publishYear}</p>
                      )}
                    </div>
                  </button>
                ))}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => saveBook(searchTitle.trim() || 'Untitled', searchAuthor.trim())}
                  >
                    None of these — add manually
                  </Button>
                  <Button variant="outline" onClick={() => setStep({ type: 'form' })}>
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Confirm ──────────────────────────────────────────────────────── */}
        {step.type === 'confirm' && (
          <div className="pt-2 space-y-5">
            <div className="flex gap-4">
              <div className="w-20 h-28 shrink-0 bg-muted overflow-hidden">
                {step.book.coverUrl
                  ? <img src={step.book.coverUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif font-semibold text-lg leading-snug">{step.book.title}</p>
                {step.book.authors[0] && (
                  <p className="text-sm text-muted-foreground mt-1">{step.book.authors[0]}</p>
                )}
                {step.book.publishYear && (
                  <p className="eyebrow text-muted-foreground mt-2">{step.book.publishYear}</p>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">Add this book to your library?</p>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => saveBook(step.book.title, step.book.authors[0] ?? '')}
              >
                Add to Library
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep({
                  type: 'editing',
                  book: step.book,
                  editTitle:  step.book.title,
                  editAuthor: step.book.authors[0] ?? '',
                })}
              >
                Edit
              </Button>
              <Button variant="outline" onClick={() => setStep({ type: 'results', books: lastResults, noResults: lastResults.length === 0 })}>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Editing ──────────────────────────────────────────────────────── */}
        {step.type === 'editing' && (
          <div className="pt-2 space-y-4">
            <p className="eyebrow text-muted-foreground">Edit details before saving</p>

            <div className="space-y-2">
              <label className="eyebrow">Title</label>
              <input
                autoFocus
                value={step.editTitle}
                onChange={e => setStep({ ...step, editTitle: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="eyebrow">Author</label>
              <input
                value={step.editAuthor}
                onChange={e => setStep({ ...step, editAuthor: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                disabled={!step.editTitle.trim() && !step.editAuthor.trim()}
                onClick={() => saveBook(step.editTitle.trim() || 'Untitled', step.editAuthor.trim())}
              >
                Add to Library
              </Button>
              <Button variant="outline" onClick={() => setStep({ type: 'confirm', book: step.book })}>
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            </div>
          </div>
        )}

        {/* ── Saving ───────────────────────────────────────────────────────── */}
        {step.type === 'saving' && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Saving to your library…</p>
          </div>
        )}

        {/* ── Done ─────────────────────────────────────────────────────────── */}
        {step.type === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <div>
              <p className="font-serif font-semibold text-xl leading-snug">{step.title}</p>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function MicBtn({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={active ? 'Stop listening' : 'Tap to speak'}
      className={[
        'absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 transition-colors',
        active ? 'text-destructive' : 'text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      <Mic className={['w-4 h-4', active ? 'animate-pulse' : ''].join(' ')} />
    </button>
  );
}

function Hint({ field }: { field: 'title' | 'author' }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground animate-pulse">
      🎙 Listening — say the {field === 'title' ? 'book title' : "author's name"}…
    </p>
  );
}
