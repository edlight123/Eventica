import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BRAND } from '@/config/brand'
import { ToastProvider } from '@/components/ui/Toast'
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt'
import { I18nProvider } from '@/components/I18nProvider'

// Force rebuild 2024-01-XX - Fix Suspense errors cascading from discover page
const inter = Inter({ subsets: ['latin'] })

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tikem.co'
const siteDescription = `Discover and buy tickets for events in Haiti - ${BRAND.name}`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: BRAND.name,
  description: siteDescription,
  applicationName: BRAND.name,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/color.svg?v=1', type: 'image/svg+xml' },
      { url: '/icon-192.svg', type: 'image/svg+xml' },
      { url: '/icon-512.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/tikem_logo_color.png', sizes: '500x500', type: 'image/png' },
    ],
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
    <html lang="en">
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
