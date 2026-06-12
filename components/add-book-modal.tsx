'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/lib/preferences';
import { searchByTitleAuthor, type GoogleBook } from '@/lib/google-books';
import { Mic, Loader2, CheckCircle2, Search, ArrowLeft, MicOff, Check } from 'lucide-react';

// ── State machine ─────────────────────────────────────────────────────────────

type Step =
  | { type: 'form' }
  | { type: 'searching' }
  | { type: 'results';  books: GoogleBook[] }
  | { type: 'saving';   total: number; progress: number }
  | { type: 'done';     count: number };

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

  // Search inputs persist across steps so Back restores them
  const [searchTitle,  setSearchTitle]  = useState('');
  const [searchAuthor, setSearchAuthor] = useState('');

  const [step,     setStep]     = useState<Step>({ type: 'form' });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Voice
  const [activeField,      setActiveField]      = useState<'title' | 'author'>('title');
  const [listeningFor,     setListeningFor]     = useState<'title' | 'author' | null>(null);
  const [voiceAvailable,   setVoiceAvailable]   = useState<boolean | null>(null);
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
    setStep({ type: 'form' });
    setSelected(new Set());
    setPermissionDenied(false);
    abort();
  }

  function handleClose(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  const canSearch = searchTitle.trim().length > 0 || searchAuthor.trim().length > 0;

  // ── Voice ─────────────────────────────────────────────────────────────────

  function startListening(field: 'title' | 'author') {
    abort();
    const SR = getSR();
    if (!SR) { setVoiceAvailable(false); return; }
    let rec: SpeechRecognition;
    try { rec = new SR(); } catch { setVoiceAvailable(false); return; }

    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => setListeningFor(field);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0]?.[0]?.transcript?.trim() ?? '';
      if (t) { if (field === 'title') setSearchTitle(t); else setSearchAuthor(t); }
      setListeningFor(null);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListeningFor(null);
      if (e.error === 'not-allowed' || e.error === 'permission-denied') setPermissionDenied(true);
      else if (e.error === 'service-not-allowed' || e.error === 'not-supported') setVoiceAvailable(false);
      else if (e.error !== 'no-speech' && e.error !== 'aborted') toast.error('Voice failed — type instead.');
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
    setSelected(new Set());
    const books = await searchByTitleAuthor(searchTitle, searchAuthor);
    setStep({ type: 'results', books });
  }

  // ── Multi-select helpers ──────────────────────────────────────────────────

  function toggleBook(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll(books: GoogleBook[]) {
    if (selected.size === books.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(books.map(b => b.id)));
    }
  }

  // ── Batch save ────────────────────────────────────────────────────────────

  async function saveSelected(books: GoogleBook[]) {
    const toSave = books.filter(b => selected.has(b.id));
    if (toSave.length === 0) return;

    setStep({ type: 'saving', total: toSave.length, progress: 0 });

    let done = 0;
    for (const book of toSave) {
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
      } catch {
        toast.error(`Failed to save "${book.title}" — skipped.`);
      }
      done++;
      setStep({ type: 'saving', total: toSave.length, progress: done });
    }

    setStep({ type: 'done', count: done });
  }

  const showMic = voiceAvailable === true && !permissionDenied;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a Book</DialogTitle>
          <DialogDescription>
            Search Google Books and Open Library by title, author, or both.
          </DialogDescription>
        </DialogHeader>

        {/* ── Form ──────────────────────────────────────────────────────── */}
        {step.type === 'form' && (
          <div className="pt-2 space-y-5">
            {permissionDenied && (
              <div className="flex items-start gap-2.5 p-3 bg-muted border border-border text-xs">
                <MicOff className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <p>Microphone blocked — click 🔒 in the address bar, set Microphone to <strong>Allow</strong>, then reload.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="eyebrow">Title</label>
                <input
                  autoFocus
                  value={searchTitle}
                  onChange={e => setSearchTitle(e.target.value)}
                  onFocus={() => setActiveField('title')}
                  onKeyDown={e => e.key === 'Enter' && canSearch && handleSearch()}
                  placeholder="e.g. The Secret History"
                  className="w-full px-3 py-2.5 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground placeholder:italic focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="eyebrow">Author</label>
                <input
                  value={searchAuthor}
                  onChange={e => setSearchAuthor(e.target.value)}
                  onFocus={() => setActiveField('author')}
                  onKeyDown={e => e.key === 'Enter' && canSearch && handleSearch()}
                  placeholder="e.g. Donna Tartt"
                  className="w-full px-3 py-2.5 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground placeholder:italic focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {showMic && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <MicBtn
                  active={listeningFor === activeField}
                  onToggle={() => listeningFor === activeField ? abort() : startListening(activeField)}
                />
                <p className="text-sm text-muted-foreground">
                  {listeningFor
                    ? `Listening for ${listeningFor}…`
                    : 'Prefer to speak? Tap the mic once to dictate a title or author.'}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!canSearch} onClick={handleSearch}>
                <Search className="w-3.5 h-3.5" />
                Search
              </Button>
            </div>
          </div>
        )}

        {/* ── Searching ─────────────────────────────────────────────────── */}
        {step.type === 'searching' && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Searching Google Books and Open Library…</p>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {step.type === 'results' && (
          <div className="pt-2 space-y-4">
            {step.books.length === 0 ? (
              /* No results */
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No results found — you can still add this book manually.
                </p>
                <div className="p-4 bg-muted border border-border">
                  <p className="font-serif font-medium">{searchTitle || '—'}</p>
                  {searchAuthor && <p className="text-xs text-muted-foreground mt-1">{searchAuthor}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      setStep({ type: 'saving', total: 1, progress: 0 });
                      try {
                        await addBook({ title: searchTitle.trim() || 'Untitled', author: searchAuthor.trim(), genre: '', dateOrdered: '', unitPrice: '', totalAmount: '', orderStatus: '', orderId: '' });
                        setStep({ type: 'done', count: 1 });
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to save.');
                        setStep({ type: 'form' });
                      }
                    }}
                  >
                    Add to Library
                  </Button>
                  <Button variant="outline" onClick={() => setStep({ type: 'form' })}>
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Header row: count + select-all + back */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {step.books.length} result{step.books.length !== 1 ? 's' : ''}
                    {selected.size > 0 && ` · ${selected.size} selected`}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAll(step.books)}
                      className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selected.size === step.books.length ? 'Deselect all' : 'Select all'}
                    </button>
                    <button
                      onClick={() => setStep({ type: 'form' })}
                      className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back
                    </button>
                  </div>
                </div>

                {/* Scrollable book list */}
                <div className="overflow-y-auto max-h-[50vh] divide-y divide-border border border-border">
                  {step.books.map(book => {
                    const isSelected = selected.has(book.id);
                    return (
                      <button
                        key={book.id}
                        onClick={() => toggleBook(book.id)}
                        className={[
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                          isSelected ? 'bg-secondary' : 'hover:bg-muted/40',
                        ].join(' ')}
                      >
                        {/* Checkbox */}
                        <div className={[
                          'w-4 h-4 shrink-0 border flex items-center justify-center transition-colors',
                          isSelected ? 'bg-foreground border-foreground' : 'border-border',
                        ].join(' ')}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-background" />}
                        </div>

                        {/* Cover */}
                        <div className="w-8 h-11 shrink-0 bg-muted overflow-hidden">
                          {book.coverUrl
                            ? <img src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                            : null}
                        </div>

                        {/* Meta */}
                        <div className="min-w-0 flex-1">
                          <p className="font-serif text-sm font-medium leading-snug line-clamp-1">{book.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {book.authors[0] ?? ''}
                            {book.publishYear ? ` · ${book.publishYear}` : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Add button */}
                <Button
                  className="w-full"
                  disabled={selected.size === 0}
                  onClick={() => saveSelected(step.books)}
                >
                  Add {selected.size > 0 ? `${selected.size} ` : ''}
                  {selected.size === 1 ? 'Book' : 'Books'} to Library
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Saving ────────────────────────────────────────────────────── */}
        {step.type === 'saving' && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Saving {step.progress} of {step.total}…
            </p>
            {/* Progress bar */}
            <div className="w-48 h-0.5 bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${(step.progress / step.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Done ──────────────────────────────────────────────────────── */}
        {step.type === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <div>
              <p className="font-serif text-2xl font-normal">
                {step.count === 1 ? '1 book' : `${step.count} books`} added
              </p>
              <p className="text-sm text-muted-foreground mt-1">Saved to your library</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={reset}>Add More</Button>
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
        'flex items-center justify-center shrink-0 w-9 h-9 rounded-full border transition-colors',
        active
          ? 'border-destructive text-destructive'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      <Mic className={['w-3.5 h-3.5', active ? 'animate-pulse' : ''].join(' ')} />
    </button>
  );
}
