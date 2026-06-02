'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePreferences } from '@/lib/preferences';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const { dislikedBookIds, dislikedAuthorIds } = usePreferences();
  const hiddenCount = dislikedBookIds.length + dislikedAuthorIds.length;

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'text-[10px] uppercase tracking-[0.18em] font-medium transition-opacity',
        pathname === href || pathname.startsWith(href + '/')
          ? 'text-foreground opacity-100'
          : 'text-foreground opacity-40 hover:opacity-70'
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

        {/* Wordmark — no icon, pure editorial */}
        <Link href="/" className="group">
          <span className="font-serif text-xl font-medium tracking-tight group-hover:opacity-70 transition-opacity">
            Reading Memory
          </span>
        </Link>

        {/* Navigation — uppercase, wide tracking */}
        <nav className="flex items-center gap-8">
          {navLink('/library', 'Library')}
          {navLink('/authors', 'Authors')}

          <Link
            href="/disliked"
            className={cn(
              'text-[10px] uppercase tracking-[0.18em] font-medium transition-opacity',
              pathname === '/disliked'
                ? 'text-foreground opacity-100'
                : 'text-foreground opacity-40 hover:opacity-70'
            )}
          >
            Hidden
            {hiddenCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[9px] bg-foreground text-background">
                {hiddenCount}
              </span>
            )}
          </Link>

          <Link
            href="/settings"
            className={cn(
              'text-[10px] uppercase tracking-[0.18em] font-medium transition-opacity',
              pathname === '/settings'
                ? 'text-foreground opacity-100'
                : 'text-foreground opacity-40 hover:opacity-70'
            )}
          >
            Import
          </Link>
        </nav>
      </div>
    </header>
  );
}
