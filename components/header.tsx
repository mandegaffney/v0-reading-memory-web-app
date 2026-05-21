'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Home, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <BookOpen className="w-6 h-6 text-accent group-hover:text-foreground transition-colors" />
          <span className="font-serif text-xl font-semibold tracking-tight">
            Reading Memory
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className={cn(
              "text-sm tracking-wide transition-colors",
              pathname === '/'
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="hidden sm:inline">Library</span>
            <Home className="w-5 h-5 sm:hidden" />
          </Link>
          <Link
            href="/settings"
            className={cn(
              "text-sm tracking-wide transition-colors flex items-center gap-2",
              pathname === '/settings'
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
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
