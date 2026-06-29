'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { useRouter } from 'next/navigation'
import { TikemWordmark } from '@/components/ui/TikemLogo'
import { useState, useEffect } from 'react'
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
}

export default function Navbar({ user, isAdmin = false }: NavbarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation('common')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const redirectTarget = (() => {
    const query = searchParams?.toString()
    return query ? `${pathname}?${query}` : pathname
  })()

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

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
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
                href="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/' ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.home')}
              </Link>
              <Link
                href="/discover"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === '/discover' ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.discover')}
              </Link>
              <Link
                href="/platform"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname?.startsWith('/platform') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.platform', { defaultValue: 'Platform' })}
              </Link>
              {user && (
                <>
                  <Link
                    href="/tickets"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname?.startsWith('/tickets') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t('nav.myTickets')}
                  </Link>
                  <Link
                    href="/favorites"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname === '/favorites' ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t('nav.favorites')}
                  </Link>
                  <Link
                    href="/connections"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname?.startsWith('/connections') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    Friends
                  </Link>
                  <Link
                    href="/organizer"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      pathname?.startsWith('/organizer') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t('nav.organizer')}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        pathname?.startsWith('/admin') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {t('nav.admin')}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notification Bell */}
                <NotificationBell userId={user.id} />
                
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-md ring-2 ring-white/10">
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="font-medium">{user.full_name}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  {t('nav.signOut')}
                </button>
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
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/' ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.home')}
              </Link>
              <Link
                href="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/discover' ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.discover')}
              </Link>
              <Link
                href="/platform"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname?.startsWith('/platform') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t('nav.platform', { defaultValue: 'Platform' })}
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
                    Friends
                  </Link>
                  <Link
                    href="/organizer/events"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      pathname?.startsWith('/organizer') ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t('nav.myEvents')}
                  </Link>
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
