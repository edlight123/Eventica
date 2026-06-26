'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DollarSign, Settings } from 'lucide-react'

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
 * Posh-style organizer navigation: a single lean, horizontal tab bar pinned
 * under the main navbar (Home · Events · Marketing · Orders · Team), with
 * finance + settings on the right. Replaces the heavy left sidebar.
 */
export function OrganizerTopNav({ draftEvents = 0, pendingPayouts = 0 }: OrganizerTopNavProps) {
  const pathname = usePathname()

  const tabs: Tab[] = [
    { label: 'Home', href: '/organizer' },
    { label: 'Events', href: '/organizer/events', badge: draftEvents },
    { label: 'Marketing', href: '/organizer/marketing' },
    { label: 'Orders', href: '/organizer/orders' },
    { label: 'Team', href: '/organizer/team' },
  ]

  const isActive = (href: string) =>
    href === '/organizer' ? pathname === '/organizer' : pathname?.startsWith(href)

  const financeActive =
    pathname?.startsWith('/organizer/finance') ||
    pathname?.startsWith('/organizer/earnings') ||
    pathname?.startsWith('/organizer/payouts')
  const settingsActive = pathname?.startsWith('/organizer/settings')

  return (
    <div className="sticky top-14 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl sm:top-16">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        <nav className="scrollbar-hide flex flex-1 items-center gap-1 overflow-x-auto">
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

        {/* Right: finance + settings */}
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/organizer/finance"
            aria-label="Finance"
            className={`relative grid h-9 w-9 place-items-center rounded-lg transition-colors ${
              financeActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
            }`}
          >
            <DollarSign className="h-[18px] w-[18px]" />
            {pendingPayouts > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {pendingPayouts > 9 ? '9+' : pendingPayouts}
              </span>
            )}
          </Link>
          <Link
            href="/organizer/settings"
            aria-label="Settings"
            className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
              settingsActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </div>
    </div>
  )
}
