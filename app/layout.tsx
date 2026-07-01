import type { Metadata, Viewport } from 'next'
import { Inter, Instrument_Serif, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { BRAND } from '@/config/brand'
import { ToastProvider } from '@/components/ui/Toast'
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt'
import { I18nProvider } from '@/components/I18nProvider'

// Body / UI typeface
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Editorial display typeface (headlines, wordmark) — gives the public site its poster feel
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif-display',
  display: 'swap',
})

// Mono-ish grotesk for buttons, nav and dense UI
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
})

// Technical layer — monospace for eyebrows, dates, prices-as-data and ticket IDs
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tikem.co'
const siteDescription = `Discover and buy tickets for events in Haiti - ${BRAND.name}`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: BRAND.name,
  description: siteDescription,
  applicationName: BRAND.name,
  manifest: '/manifest.json',
  icons: {
    // Adaptive SVG favicon: dark tile on light browser chrome, white tile on dark.
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    // Apple home-screen icon must be opaque on any wallpaper — use the fixed dark tile.
    apple: [{ url: '/tikem-mark.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: BRAND.name,
    description: siteDescription,
    url: siteUrl,
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — ${BRAND.tagline ?? 'Discover Events in Haiti'}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.name,
    description: siteDescription,
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND.name,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#0F766E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <head>
        {/* DNS Prefetch for faster external resource loading */}
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://api.resend.com" />
        {/* Preconnect for critical resources */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.stripe.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className + ' mobile-typography'}>
        <I18nProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
          <PWAInstallPrompt />
        </I18nProvider>
      </body>
    </html>
  )
}
