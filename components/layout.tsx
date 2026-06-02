import { cn } from '@/lib/utils';

// ── Section ───────────────────────────────────────────────────────────────────

interface SectionProps {
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
  className?: string;
  action?:   React.ReactNode;
}

export function Section({ title, subtitle, children, className, action }: SectionProps) {
  return (
    <section className={cn('py-16', className)}>
      <div className="flex items-baseline justify-between mb-10 gap-6">
        <div>
          {/* Large serif headline — magazine editorial */}
          <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight leading-none">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="pt-14 pb-10 border-b border-border">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="font-serif text-5xl md:text-6xl font-semibold tracking-tight text-balance leading-[0.95]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-muted-foreground mt-4 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

// ── BookGrid ──────────────────────────────────────────────────────────────────

interface BookGridProps {
  children:   React.ReactNode;
  columns?:   2 | 3 | 4 | 5;
  className?: string;
}

export function BookGrid({ children, columns = 4, className }: BookGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-6 md:gap-10', gridCols[columns], className)}>
      {children}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title:       string;
  description: string;
  action?:     React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="py-20 px-6 text-center">
      <h3 className="font-serif text-2xl font-medium mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{description}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
