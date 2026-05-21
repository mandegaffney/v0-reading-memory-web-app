'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePreferences } from '@/lib/preferences';
import { Settings, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const { dislikedBookIds, dislikedAuthorIds } = usePreferences();
  const hiddenCount = dislikedBookIds.length + dislikedAuthorIds.length;

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'text-sm tracking-wide transition-colors',
        pathname === href || pathname.startsWith(href + '/')
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <BookOpen className="w-6 h-6 text-accent group-hover:text-foreground transition-colors" />
          <span className="font-serif text-xl font-semibold tracking-tight">Reading Memory</span>
        </Link>

        <nav className="flex items-center gap-6">
          {navLink('/library', 'Library')}
          {navLink('/authors', 'Authors')}
          <Link
            href="/disliked"
            className={cn(
              'text-sm tracking-wide transition-colors',
              pathname === '/disliked'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Hidden
            {hiddenCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                {hiddenCount}
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            className={cn(
              'text-sm tracking-wide transition-colors flex items-center gap-1.5',
              pathname === '/settings'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
