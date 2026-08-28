'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { useRouter } from 'next/navigation'
import { TikemWordmark } from '@/components/ui/TikemLogo'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { isDemoMode, isDemoEmail } from '@/lib/demo'
import { demoLogout } from '@/app/auth/actions'
import { NotificationBell } from './NotificationBell'

interface NavbarProps {
  user?: {
    id: string
    full_name: string
    email: string
    role: 'attendee' | 'organizer' | 'staff'
  } | null
  isAdmin?: boolean
  /**
   * Drop the navbar's own bottom rule. For pages (discover) that pin their own
   * bar directly beneath it: with both rules drawn, the top of the page reads
   * as a stack of hairlines rather than one header band — the page's bar then
   * supplies the band's single bottom edge.
   */
  flush?: boolean
}

export default function Navbar({ user, isAdmin = false, flush = false }: NavbarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation('common')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  const isHost = user?.role === 'organizer' || user?.role === 'staff'

  // "Promoter portal" appears only for accounts that have claimed at least one
  // promoter record. Probed once per browser session (sessionStorage cache) so
  // ordinary visitors never pay for it twice.
  const [isPromoter, setIsPromoter] = useState(false)
  useEffect(() => {
    if (!user) return
    try {
      const cached = sessionStorage.getItem('tikem_is_promoter')
      if (cached !== null) {
        setIsPromoter(cached === '1')
        return
      }
    } catch {
      // Storage unavailable — fall through to the probe.
    }
    let cancelled = false
    fetch('/api/promoter/portfolio?summary=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const has = Boolean(d && Number(d.count) > 0)
        if (!cancelled) setIsPromoter(has)
        try {
          sessionStorage.setItem('tikem_is_promoter', has ? '1' : '0')
        } catch {}
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const redirectTarget = (() => {
    const query = searchParams?.toString()
    return query ? `${pathname}?${query}` : pathname
  })()

  // Close the account dropdown on outside-click and Escape.
  useEffect(() => {
    if (!accountMenuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountMenuOpen])

  async function handleSignOut() {
    // Handle demo logout
    if (isDemoMode() && user && isDemoEmail(user.email)) {
      await demoLogout()
      return
    }

    // Regular Supabase logout
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const accountMenuItemClass =
    'block w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors duration-200'

  return (
    <nav className={`sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl ${flush ? '' : 'border-b border-white/10'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <Link href="/" className="group flex items-center">
              <TikemWordmark
                className="text-[28px] text-white sm:text-[30px] transition-opacity duration-200 group-hover:opacity-80"
              />
            </Link>
            <div className="hidden md:ml-8 md:flex md:space-x-2 lg:space-x-4">
              <Link
                href="/discover"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/' || pathname === '/discover'
                    ? 'text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.home')}
              </Link>
              <Link
                href="/resources"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname?.startsWith('/resources') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.resources', { defaultValue: 'Guides' })}
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notification Bell */}
                <NotificationBell userId={user.id} />

                {/* Account dropdown (desktop) */}
                <div className="relative hidden sm:block" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                    aria-label={user.full_name}
                    className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-md ring-2 ring-white/10">
                      {user.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium">{user.full_name}</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${accountMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {accountMenuOpen && (
                    <div
                      role="menu"
                      aria-label={user.full_name}
                      className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl"
                    >
                      <Link
                        href="/tickets"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className={accountMenuItemClass}
                      >
                        {t('nav.myTickets')}
                      </Link>
                      <Link
                        href="/favorites"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className={accountMenuItemClass}
                      >
                        {t('nav.favorites')}
                      </Link>
                      <Link
                        href="/connections"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className={accountMenuItemClass}
                      >
                        {t('nav.friends', { defaultValue: 'Friends' })}
                      </Link>
                      {isHost ? (
                        <Link
                          href="/organizer"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className={accountMenuItemClass}
                        >
                          {t('nav.organizer')}
                        </Link>
                      ) : (
                        <Link
                          href="/organizer"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className={accountMenuItemClass}
                        >
                          {t('nav.becomeHost', { defaultValue: 'Become a host' })}
                        </Link>
                      )}
                      {isPromoter && (
                        <Link
                          href="/promoter"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className={accountMenuItemClass}
                        >
                          {t('nav.promoterPortal', { defaultValue: 'Promoter portal' })}
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          role="menuitem"
                          onClick={() => setAccountMenuOpen(false)}
                          className={accountMenuItemClass}
                        >
                          {t('nav.admin')}
                        </Link>
                      )}
                      <div className="my-1 border-t border-white/10" />
                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className={accountMenuItemClass}
                      >
                        {t('nav.profile')}
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false)
                          handleSignOut()
                        }}
                        className={accountMenuItemClass}
                      >
                        {t('nav.signOut')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href={`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`}
                  className="hidden sm:inline-flex items-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition-all duration-200 hover:border-white/30 hover:bg-white/5"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  href={`/auth/signup?redirect=${encodeURIComponent(redirectTarget)}`}
                  className="inline-flex items-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700"
                >
                  {t('auth:signup.submit')}
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white/80 hover:bg-white/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="space-y-1">
              <Link
                href="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/' || pathname === '/discover'
                    ? 'text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.home')}
              </Link>
              <Link
                href="/resources"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname?.startsWith('/resources') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.resources', { defaultValue: 'Guides' })}
              </Link>
              {user && (
                <>
                  <Link
                    href="/tickets"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname?.startsWith('/tickets') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t('nav.myTickets')}
                  </Link>
                  <Link
                    href="/favorites"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname === '/favorites' ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t('nav.favorites')}
                  </Link>
                  <Link
                    href="/connections"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname?.startsWith('/connections') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t('nav.friends', { defaultValue: 'Friends' })}
                  </Link>
                  {isHost ? (
                    <Link
                      href="/organizer"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                        pathname?.startsWith('/organizer') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {t('nav.organizer')}
                    </Link>
                  ) : (
                    <Link
                      href="/organizer"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                        pathname?.startsWith('/organizer') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {t('nav.becomeHost', { defaultValue: 'Become a host' })}
                    </Link>
                  )}
                  {isPromoter && (
                    <Link
                      href="/promoter"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                        pathname?.startsWith('/promoter') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {t('nav.promoterPortal', { defaultValue: 'Promoter portal' })}
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                        pathname?.startsWith('/admin') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {t('nav.admin')}
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname === '/profile' ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t('nav.profile')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleSignOut()
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    {t('nav.signOut')}
                  </button>
                </>
              )}
              {!user && (
                <>
                  <Link
                    href={`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    {t('nav.signIn')}
                  </Link>
                  <Link
                    href={`/auth/signup?redirect=${encodeURIComponent(redirectTarget)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    {t('auth:signup.submit')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
