'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DollarSign, Settings, Menu, X, ChevronRight } from 'lucide-react'
import { useState } from 'react'

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
 * Posh-style organizer navigation: horizontal tab bar on md+, hamburger drawer on mobile.
 */
export function OrganizerTopNav({ draftEvents = 0, pendingPayouts = 0 }: OrganizerTopNavProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const activeTab = tabs.find((t) => isActive(t.href))

  return (
    <>
      <div className="sticky top-14 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl sm:top-16">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">

          {/* Desktop: full tab bar */}
          <nav className="scrollbar-hide hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
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

          {/* Mobile: current section label + hamburger */}
          <div className="flex flex-1 items-center justify-between md:hidden">
            <span className="py-3.5 text-sm font-semibold text-white">
              {activeTab?.label ?? 'Organizer'}
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open organizer menu"
              aria-expanded={drawerOpen ? 'true' : 'false'}
              className="grid h-9 w-9 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Right: finance + settings — always visible */}
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

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Organizer menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Sheet from bottom */}
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-white/10 bg-[#141414] pb-safe">
            {/* Handle */}
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-semibold text-white/60">Organizer menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="px-3 pb-4">
              {tabs.map((tab) => {
                const active = isActive(tab.href)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-brand-500/10 text-brand-300'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {tab.label}
                      {tab.badge ? (
                        <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                          {tab.badge > 9 ? '9+' : tab.badge}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/30" />
                  </Link>
                )
              })}

              {/* Finance + Settings in drawer too */}
              <div className="mt-2 border-t border-white/5 pt-2">
                <Link
                  href="/organizer/finance"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                    financeActive ? 'bg-brand-500/10 text-brand-300' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4" />
                    Finance
                    {pendingPayouts > 0 && (
                      <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                        {pendingPayouts > 9 ? '9+' : pendingPayouts}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </Link>
                <Link
                  href="/organizer/settings"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                    settingsActive ? 'bg-brand-500/10 text-brand-300' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Settings className="h-4 w-4" />
                    Settings
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
