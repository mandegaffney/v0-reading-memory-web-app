import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function Section({ title, subtitle, children, className, action }: SectionProps) {
  return (
    <section className={cn("py-12", className)}>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="pt-12 pb-8 border-b border-border">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg text-muted-foreground mt-3 max-w-2xl">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

interface BookGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
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
    <div className={cn(
      "grid gap-6 md:gap-8",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6">
      <h3 className="font-serif text-xl font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
