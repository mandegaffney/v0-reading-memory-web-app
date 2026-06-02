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
import { Mic, Loader2, CheckCircle2, Search, MicOff } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = { type: 'form' } | { type: 'saving' } | { type: 'done'; title: string };
type ListeningFor = 'title' | 'author' | null;

// ── SpeechRecognition factory ─────────────────────────────────────────────────

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

  const [step,   setStep]   = useState<Step>({ type: 'form' });
  const [title,  setTitle]  = useState('');
  const [author, setAuthor] = useState('');
  const [genre,  setGenre]  = useState('');

  // Three-state voice availability:
  //   null  = not yet detected (SSR)
  //   true  = available
  //   false = permanently unavailable on this device/browser
  const [voiceAvailable,   setVoiceAvailable]   = useState<boolean | null>(null);
  // Mic permission was explicitly denied — show inline help, not just a toast
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [listeningFor,     setListeningFor]     = useState<ListeningFor>(null);
  const [isLookingUp,      setIsLookingUp]      = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  // Detect support once on client
  useEffect(() => {
    setVoiceAvailable(getSR() !== null);
  }, []);

  // Abort recognition when modal closes
  useEffect(() => {
    if (!open) abort();
  }, [open]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function abort() {
    try { recRef.current?.abort(); } catch {}
    recRef.current = null;
    setListeningFor(null);
  }

  function reset() {
    setStep({ type: 'form' });
    setTitle('');
    setAuthor('');
    setGenre('');
    setPermissionDenied(false);
    abort();
  }

  function handleClose(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  // ── Voice input ───────────────────────────────────────────────────────────

  function startListening(field: 'title' | 'author') {
    abort(); // cancel any active session

    const SR = getSR();
    if (!SR) { setVoiceAvailable(false); return; }

    let rec: SpeechRecognition;
    try { rec = new SR(); }
    catch { setVoiceAvailable(false); return; }

    rec.lang            = 'en-US';
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.maxAlternatives = 1;

    rec.onstart  = () => setListeningFor(field);

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0]?.[0]?.transcript?.trim() ?? '';
      if (text) {
        if (field === 'title')  setTitle(text);
        if (field === 'author') setAuthor(text);
      }
      setListeningFor(null);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setListeningFor(null);
      switch (e.error) {
        // Device/browser doesn't support the speech service — hide the feature
        case 'service-not-allowed':
        case 'not-supported':
          setVoiceAvailable(false);
          break;
        // User denied mic permission — show inline help inside the modal
        case 'not-allowed':
        case 'permission-denied' as SpeechRecognitionErrorCode:
          setPermissionDenied(true);
          break;
        // Silence — user didn't speak; no toast needed
        case 'no-speech':
          break;
        // User aborted — silent
        case 'aborted':
          break;
        // Network / other
        default:
          toast.error('Voice input failed — try typing instead.');
      }
    };

    rec.onend = () => setListeningFor(null);

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setListeningFor(null);
      recRef.current = null;
      setVoiceAvailable(false);
    }
  }

  // ── Google Books lookup ───────────────────────────────────────────────────

  async function lookUpOnGoogleBooks() {
    if (!title.trim()) return;
    setIsLookingUp(true);
    try {
      const books = await searchByText([title.trim(), author.trim()].filter(Boolean).join(' '));
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

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) return;
    setStep({ type: 'saving' });
    try {
      await addBook({ title: title.trim(), author: author.trim(), genre: genre.trim(),
        dateOrdered: '', unitPrice: '', totalAmount: '', orderStatus: '', orderId: '' });
      setStep({ type: 'done', title: title.trim() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save book.');
      setStep({ type: 'form' });
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  // Show mic buttons only when voice is confirmed available and not denied
  const showMic = voiceAvailable === true && !permissionDenied;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-semibold">Add a Book</DialogTitle>
        </DialogHeader>

        {/* ── Form ── */}
        {step.type === 'form' && (
          <div className="pt-2 space-y-5">

            {/* Permission denied — inline help banner */}
            {permissionDenied && (
              <div className="flex items-start gap-2.5 p-3 bg-muted border border-border">
                <MicOff className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">Microphone access blocked</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click the 🔒 icon in your browser&apos;s address bar, set
                    Microphone to <strong>Allow</strong>, then reload the page.
                  </p>
                </div>
              </div>
            )}

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
                  placeholder="Book title"
                  className="w-full px-3 py-2.5 pr-11 text-sm border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {showMic && (
                  <MicButton
                    active={listeningFor === 'title'}
                    onToggle={() => listeningFor === 'title' ? abort() : startListening('title')}
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
                  className="w-full px-3 py-2.5 pr-11 text-sm border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {showMic && (
                  <MicButton
                    active={listeningFor === 'author'}
                    onToggle={() => listeningFor === 'author' ? abort() : startListening('author')}
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
                {isLookingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                {isLookingUp ? 'Looking up…' : 'Look up on Google Books'}
              </button>
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

function ListeningHint({ field }: { field: 'title' | 'author' }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground animate-pulse">
      🎙 Listening — say the {field === 'title' ? 'book title' : "author's name"}…
    </p>
  );
}
