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
   * FOUR tabs, icon-only.
   *
   * This used to build up to six (Friends, and Organizer/Admin, on top of
   * these four) WITH labels. Six tabs across a 402px phone is ~67px each, and
   * the 11px labels were `truncate`d, so "My Tickets" and "Événements"
   * rendered as clipped fragments — the labels were breaking, not helping.
   * The set came down to four, and then the labels came off entirely: at four
   * tabs the icons have room to breathe, and a label that only ever fits in
   * some locales is worse than no label plus a proper `aria-label`.
   *
   * The tab set is FIXED at four now, so keep it that way. The moment a fifth
   * is added the icons start competing again, and without labels there is
   * nothing to disambiguate them.
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 z-50 safe-area-inset-bottom will-change-contents" style={{ minHeight: '56px' }}>
      <div className="flex items-center justify-around px-1 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              aria-current={active ? 'page' : undefined}
              /* The label is gone from view but NOT from the accessibility
                 tree: without it every tab would announce as a bare link with
                 no name, which is the usual way an icon-only bar breaks for
                 screen readers. */
              aria-label={tab.label}
              className="flex flex-1 items-center justify-center min-w-0"
            >
              {/* The active tab is now carried by a FILL behind the icon plus
                  the teal, because with the labels removed colour alone was
                  the only thing left saying where you are — and on these
                  icons (Compass for Discover, Ticket for Tickets) that was
                  too quiet to read at a glance. 0.08 is the ladder's
                  selected step. The pill is also the 44px touch target. */}
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
                  active ? 'bg-white/[0.08] text-brand-400' : 'text-white/55 active:bg-white/[0.06] active:text-white'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.9} />
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
