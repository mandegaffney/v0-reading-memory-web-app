import type { Metadata, Viewport } from 'next'
import { DM_Sans, Cormorant_Garamond, Permanent_Marker } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PreferencesProvider } from '@/lib/preferences'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Body text: clean, understated — lets the serif do the talking
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// Display / headings: high-contrast, editorial, slightly dramatic
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

// Logo wordmark only — applied exclusively to "The Stack" in the header
const permanentMarker = Permanent_Marker({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-marker',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Stack',
  description: 'Track your hardcover book collection, discover new releases from favorite authors, and never buy duplicates.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#f5f1eb',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${cormorant.variable} ${permanentMarker.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen">
        <PreferencesProvider>
          {children}
          <Toaster position="bottom-right" />
        </PreferencesProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
