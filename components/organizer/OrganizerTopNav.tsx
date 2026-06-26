'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface OrganizerTopNavProps {
  draftEvents?: number
  pendingPayouts?: number
}

interface Tab {
  label: string
  href: string
  badge?: number
}

/**
 * Posh-style organizer navigation: a single lean, horizontal tab bar that pins
 * under the main navbar — replacing the heavy left sidebar. Each tab is one
 * clean destination; overflow scrolls horizontally on mobile.
 */
export function OrganizerTopNav({ draftEvents = 0, pendingPayouts = 0 }: OrganizerTopNavProps) {
  const pathname = usePathname()

  const tabs: Tab[] = [
    { label: 'Home', href: '/organizer' },
    { label: 'Events', href: '/organizer/events', badge: draftEvents },
    { label: 'Promote', href: '/organizer/promo-codes' },
    { label: 'Earnings', href: '/organizer/earnings' },
    { label: 'Payouts', href: '/organizer/payouts', badge: pendingPayouts },
    { label: 'Settings', href: '/organizer/settings' },
  ]

  const isActive = (href: string) =>
    href === '/organizer' ? pathname === '/organizer' : pathname?.startsWith(href)

  return (
    <div className="sticky top-14 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl sm:top-16">
      <nav className="scrollbar-hide mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 py-3.5 text-sm font-semibold transition-colors ${
                active ? 'text-white' : 'text-white/55 hover:text-white/80'
              }`}
            >
              {tab.label}
              {tab.badge ? (
                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              ) : null}
              {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-400" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
