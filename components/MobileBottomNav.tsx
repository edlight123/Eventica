'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Ticket, User, Briefcase, Shield, Users } from 'lucide-react'
import { useMemo } from 'react'
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

  const tabs = useMemo(() => [
    { href: '/', label: t('nav.home'), icon: Home, show: true },
    { href: '/discover', label: t('nav.discover'), icon: Compass, show: true },
    { href: '/tickets', label: t('nav.myTickets'), icon: Ticket, show: isLoggedIn },
    { href: '/connections', label: t('nav.friends', { defaultValue: 'Friends' }), icon: Users, show: isLoggedIn },
    { href: '/profile', label: t('nav.profile'), icon: User, show: isLoggedIn },
    { href: isAdmin ? '/admin' : '/organizer', label: isAdmin ? t('nav.admin') : t('nav.organizer'), icon: isAdmin ? Shield : Briefcase, show: isLoggedIn && (isOrganizer || isAdmin) },
  ].filter(tab => tab.show), [isLoggedIn, isOrganizer, isAdmin, t])

  // Don't show if not logged in and only 2 tabs would show
  if (!isLoggedIn && tabs.length <= 2) {
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
