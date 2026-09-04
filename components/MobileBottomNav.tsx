'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Ticket, User } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface MobileBottomNavProps {
  isLoggedIn: boolean
  isOrganizer?: boolean
  isAdmin?: boolean
}

export default function MobileBottomNav({ isLoggedIn, isOrganizer = false, isAdmin = false }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { t } = useTranslation('common')

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path)
  }

  /**
   * FOUR tabs, deliberately — and the labels stay.
   *
   * This used to build up to six (Friends, and Organizer/Admin, on top of
   * these four). Six tabs across a 402px phone is ~67px each, and the 11px
   * labels are `truncate`d, so "My Tickets" and "Événements" were rendering as
   * clipped fragments: the labels were already broken rather than helping.
   * Four tabs gives ~100px each, which fits the longest label in all three
   * locales ("Événements" measures ~60px), so nothing truncates.
   *
   * Nothing is orphaned by the cut. Both the desktop dropdown and the mobile
   * hamburger in components/Navbar already link /connections, /organizer,
   * /promoter, /admin and /favorites, so the two dropped destinations keep a
   * home — a bottom bar is for the few places you go constantly, not for
   * every place you can go.
   *
   * `isOrganizer` / `isAdmin` are still accepted but no longer affect the tab
   * set. They stay in the signature because ~30 call sites pass them and
   * churning those files buys the reader nothing.
   */
  const tabs = useMemo(() => [
    { href: '/', label: t('nav.home'), icon: Home, show: true },
    { href: '/discover', label: t('nav.discover'), icon: Compass, show: true },
    { href: '/tickets', label: t('nav.myTickets'), icon: Ticket, show: isLoggedIn },
    { href: '/profile', label: t('nav.profile'), icon: User, show: isLoggedIn },
  ].filter(tab => tab.show), [isLoggedIn, t])

  // Don't show if not logged in and only 2 tabs would show
  const visible = !(!isLoggedIn && tabs.length <= 2)

  /**
   * Tell the page whether the strip at the bottom is real.
   *
   * `.pb-mobile-nav` reserves 80px on 48 pages, and it used to reserve it
   * whether or not this component rendered anything — so every signed-out
   * reader got 80px of dead space above the footer. The attribute makes the
   * reservation follow the nav; see globals.css.
   */
  useEffect(() => {
    if (!visible) return
    document.body.dataset.mobileNav = '1'
    return () => {
      delete document.body.dataset.mobileNav
    }
  }, [visible])

  if (!visible) {
    return null
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 z-50 safe-area-inset-bottom will-change-contents" style={{ minHeight: '65px' }}>
      <div className="flex items-center justify-around px-1 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className={`flex flex-1 flex-col items-center justify-center min-w-0 py-2 px-1 rounded-xl transition-colors will-change-auto ${
                active
                  ? 'text-brand-400'
                  : 'text-white/60 active:text-white active:bg-white/5'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[11px] font-medium truncate max-w-full ${active ? 'text-brand-400' : ''}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
