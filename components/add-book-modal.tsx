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
import { searchByText } from '@/lib/google-books';
import { Mic, Loader2, CheckCircle2, Search } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = { type: 'form' } | { type: 'saving' } | { type: 'done'; title: string };
type ListeningFor = 'title' | 'author' | null;

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBookModal({ open, onOpenChange }: Props) {
  const { addBook } = usePreferences();

  // Form state
  const [step,   setStep]   = useState<Step>({ type: 'form' });
  const [title,  setTitle]  = useState('');
  const [author, setAuthor] = useState('');
  const [genre,  setGenre]  = useState('');

  // Voice state
  const [listeningFor,    setListeningFor]    = useState<ListeningFor>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isLookingUp,     setIsLookingUp]     = useState(false);
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);

  // Detect Web Speech API support (client-only)
  useEffect(() => {
    setSpeechSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function reset() {
    setStep({ type: 'form' });
    setTitle('');
    setAuthor('');
    setGenre('');
    stopListening();
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  // ── Voice input ────────────────────────────────────────────────────────────

  function stopListening() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListeningFor(null);
  }

  function startListening(field: 'title' | 'author') {
    if (!speechSupported) return;
    stopListening(); // cancel any active session first

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition) as typeof window.SpeechRecognition;
    const rec = new SR();
    rec.lang            = 'en-US';
    rec.continuous      = false;
    rec.interimResults  = false;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript.trim();
      if (field === 'title')  setTitle(text);
      if (field === 'author') setAuthor(text);
      setListeningFor(null);
    };

    rec.onerror = () => {
      setListeningFor(null);
      toast.error('Voice input failed. Try again or type manually.');
    };

    rec.onend = () => setListeningFor(null);

    recognitionRef.current = rec;
    rec.start();
    setListeningFor(field);
  }

  // ── Google Books lookup ────────────────────────────────────────────────────

  async function lookUpOnGoogleBooks() {
    if (!title.trim()) return;
    setIsLookingUp(true);
    try {
      const query = [title.trim(), author.trim()].filter(Boolean).join(' ');
      const books = await searchByText(query);
      if (books[0]) {
        setTitle(books[0].title);
        if (books[0].authors[0]) setAuthor(books[0].authors[0]);
        toast.success('Details filled from Google Books');
      } else {
        toast.error('No match found — you can still save manually');
      }
    } finally {
      setIsLookingUp(false);
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) return;
    setStep({ type: 'saving' });
    try {
      await addBook({
        title:       title.trim(),
        author:      author.trim(),
        genre:       genre.trim(),
        dateOrdered: '',
        unitPrice:   '',
        totalAmount: '',
        orderStatus: '',
        orderId:     '',
      });
      setStep({ type: 'done', title: title.trim() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save book.');
      setStep({ type: 'form' });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-semibold">Add a Book</DialogTitle>
        </DialogHeader>

        {/* ── Form ── */}
        {step.type === 'form' && (
          <div className="pt-2 space-y-5">

            {/* Title */}
            <div className="space-y-2">
              <label className="eyebrow">
                Title <span className="text-destructive normal-case text-[10px]">required</span>
              </label>
              <div className="relative">
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && author && handleSave()}
                  placeholder="Book title"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {speechSupported && (
                  <MicButton
                    active={listeningFor === 'title'}
                    onToggle={() => listeningFor === 'title' ? stopListening() : startListening('title')}
                  />
                )}
              </div>
              {listeningFor === 'title' && <ListeningHint field="title" />}
            </div>

            {/* Author */}
            <div className="space-y-2">
              <label className="eyebrow">Author</label>
              <div className="relative">
                <input
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="Author name"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {speechSupported && (
                  <MicButton
                    active={listeningFor === 'author'}
                    onToggle={() => listeningFor === 'author' ? stopListening() : startListening('author')}
                  />
                )}
              </div>
              {listeningFor === 'author' && <ListeningHint field="author" />}
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <label className="eyebrow">Genre</label>
              <input
                value={genre}
                onChange={e => setGenre(e.target.value)}
                placeholder="e.g. Thriller, Literary Fiction"
                className="w-full px-3 py-2.5 text-sm border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Google Books lookup */}
            {title.trim() && (
              <button
                onClick={lookUpOnGoogleBooks}
                disabled={isLookingUp}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {isLookingUp
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Search className="w-3 h-3" />}
                {isLookingUp ? 'Looking up…' : 'Look up on Google Books'}
              </button>
            )}

            {!speechSupported && (
              <p className="text-xs text-muted-foreground">
                Voice input is available in Chrome and Edge.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" disabled={!title.trim()} onClick={handleSave}>
                Add to Library
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Saving ── */}
        {step.type === 'saving' && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Saving to your library…</p>
          </div>
        )}

        {/* ── Done ── */}
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

function MicButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors',
        active
          ? 'text-destructive'
          : 'text-muted-foreground hover:text-foreground',
      ].join(' ')}
      title={active ? 'Stop listening' : 'Tap to speak'}
    >
      <Mic className={['w-4 h-4', active ? 'animate-pulse' : ''].join(' ')} />
    </button>
  );
}

function ListeningHint({ field }: { field: 'title' | 'author' }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground animate-pulse">
      Listening — say the {field === 'title' ? 'book title' : 'author\'s name'}…
    </p>
  );
}
