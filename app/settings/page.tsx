'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/layout';
import { syncStatus } from '@/lib/data';
import { 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState(syncStatus);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setStatus(prev => ({ ...prev, status: 'syncing' }));
    
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setStatus({
      lastSyncDate: new Date().toISOString(),
      status: 'synced',
      booksImported: status.booksImported,
    });
    setIsRefreshing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusInfo = () => {
    switch (status.status) {
      case 'synced':
        return {
          icon: CheckCircle2,
          label: 'Connected & Synced',
          color: 'text-accent',
          bgColor: 'bg-accent/10',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          label: 'Syncing...',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Sync Error',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
        };
      case 'never':
      default:
        return {
          icon: Clock,
          label: 'Not Connected',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen">
      <Header />

      {/* Back navigation */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>
      </div>

      <PageHeader 
        title="Import Settings"
        subtitle="Connect your Amazon account to automatically import your hardcover purchase history."
      />

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-2xl">
          {/* Amazon Connection Card */}
          <div className="border border-border rounded-sm bg-card p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-sm bg-[#FF9900] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-xl font-semibold">Amazon Purchase History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We automatically filter for hardcover books only.
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-sm mt-6",
              statusInfo.bgColor
            )}>
              <StatusIcon className={cn("w-4 h-4", statusInfo.color, isRefreshing && "animate-spin")} />
              <span className={cn("text-sm font-medium", statusInfo.color)}>
                {statusInfo.label}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">Last synced</p>
                <p className="font-medium mt-1">{formatDate(status.lastSyncDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Books imported</p>
                <p className="font-medium mt-1">{status.booksImported} hardcovers</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-8">
              <Button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="font-medium"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Syncing...' : 'Refresh Now'}
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://www.amazon.com/gp/your-account/order-history" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Amazon
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>

          {/* How it Works */}
          <div className="mt-12">
            <h3 className="font-serif text-lg font-semibold mb-6">How it works</h3>
            <div className="space-y-6">
              <Step 
                number={1}
                title="Connect your Amazon account"
                description="Securely link your Amazon account to Reading Memory."
              />
              <Step 
                number={2}
                title="Automatic import"
                description="We scan your order history and import all hardcover book purchases."
              />
              <Step 
                number={3}
                title="Stay up to date"
                description="New purchases are automatically added to your library."
              />
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-12 pt-12 border-t border-border">
            <h3 className="font-serif text-lg font-semibold mb-6">Questions</h3>
            <div className="space-y-6">
              <FAQ 
                question="What about Kindle books?"
                answer="Reading Memory focuses exclusively on physical hardcover books. Kindle and paperback purchases are not imported."
              />
              <FAQ 
                question="How often does it sync?"
                answer="Your library automatically syncs once per day. You can also manually refresh anytime."
              />
              <FAQ 
                question="Is my Amazon data secure?"
                answer="Yes. We only access your book purchase history and never store your Amazon credentials."
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-muted-foreground">
            Reading Memory — Track your hardcover collection
          </p>
        </div>
      </footer>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-medium">
        {number}
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <h4 className="font-medium">{question}</h4>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{answer}</p>
    </div>
  );
}
