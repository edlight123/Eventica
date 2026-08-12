'use client'

import { usePathname } from 'next/navigation'

/**
 * Route-aware wrapper for the /organizer layout's chrome (top nav, bottom
 * mobile nav). /organizer/onboarding renders BARE: it hosts Stripe's embedded
 * onboarding on a chrome-free canvas — inside the mobile WebView the site nav
 * read as clutter ("too many info on this page"), and on the web the page is
 * a focused, one-task surface by design.
 *
 * A client component because layouts can't read the pathname on the server;
 * the nav elements themselves are built by the server layout and passed down
 * as already-rendered nodes.
 */
export default function OrganizerChrome({
  chromeTop,
  chromeBottom,
  children,
}: {
  chromeTop: React.ReactNode
  chromeBottom: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (pathname?.startsWith('/organizer/onboarding')) {
    return <>{children}</>
  }

  return (
    <div className="surface-dark min-h-screen">
      {chromeTop}
      <main className="pb-mobile-nav">{children}</main>
      {chromeBottom}
    </div>
  )
}
