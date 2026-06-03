'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { AddBookModal } from '@/components/add-book-modal';
import { cn } from '@/lib/utils';

// ── Navigation items ──────────────────────────────────────────────────────────

const NAV = [
  { href: '/',         label: 'Home'             },
  { href: '/library',  label: 'Library'          },
  { href: '/authors',  label: 'Favorite Authors' },
  { href: '/disliked', label: 'Hidden'           },
  { href: '/settings', label: 'Import CSV'       },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function Header() {
  const pathname = usePathname();

  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);
  const overlayRef  = useRef<HTMLDivElement>(null);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // ── Close drawer on route change ──────────────────────────────────────────
  useEffect(() => {
    closeDrawer();
  }, [pathname]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────────
          STICKY HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Wordmark */}
          <Link
            href="/"
            className="font-serif text-lg font-medium tracking-tight shrink-0 hover:opacity-70 transition-opacity"
          >
            Reading Memory
          </Link>

          {/* Right side: Add a Book + hamburger */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Add a Book — all screen sizes */}
            <button
              onClick={() => setAddBookOpen(true)}
              className="inline-flex items-center justify-center leading-none
                         px-3.5 py-2 sm:px-4 sm:py-2
                         bg-foreground text-background
                         text-[9px] sm:text-[10px] uppercase tracking-[0.16em] font-medium
                         hover:opacity-75 transition-opacity whitespace-nowrap"
            >
              Add a Book
            </button>

            {/* Hamburger / close */}
            <button
              onClick={() => setDrawerOpen(d => !d)}
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              className="p-1 text-foreground hover:opacity-60 transition-opacity"
            >
              {drawerOpen
                ? <X    className="w-5 h-5" />
                : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          BACKDROP
      ───────────────────────────────────────────────────────────────────── */}
      <div
        ref={overlayRef}
        onClick={closeDrawer}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-foreground/20',
          'transition-opacity motion-reduce:transition-none',
          drawerOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        style={{ transitionDuration: '260ms' }}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          DRAWER PANEL
          Full-width on mobile, 400px on sm+, slides in from right
      ───────────────────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50',
          'w-full sm:w-[400px]',
          'bg-background flex flex-col',
          'transform will-change-transform',
          'transition-transform motion-reduce:transition-none',
          drawerOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ transitionDuration: '300ms', transitionTimingFunction: 'cubic-bezier(0.32,0,0.67,0)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-14 px-6 border-b border-border shrink-0">
          <span className="font-serif text-lg font-medium tracking-tight">
            Reading Memory
          </span>
          <button
            onClick={closeDrawer}
            aria-label="Close menu"
            className="p-1 text-foreground hover:opacity-60 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-6 py-10 flex flex-col gap-1">
          {NAV.map(({ href, label }) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(href + '/');

            return (
              <Link
                key={href}
                href={href}
                onClick={closeDrawer}
                className={cn(
                  // Minimum 48px touch target
                  'flex items-center min-h-[56px]',
                  // Editorial magazine style: large uppercase Cormorant
                  'font-serif text-[2.5rem] leading-none font-medium uppercase tracking-[0.04em]',
                  'transition-opacity duration-150',
                  isActive
                    ? 'text-foreground opacity-100'
                    : 'text-foreground opacity-25 hover:opacity-60',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="px-6 py-6 border-t border-border shrink-0">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Reading Memory — Track your hardcover collection
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ADD BOOK MODAL — lives here so it's available on every page
      ───────────────────────────────────────────────────────────────────── */}
      <AddBookModal open={addBookOpen} onOpenChange={setAddBookOpen} />
    </>
  );
}
