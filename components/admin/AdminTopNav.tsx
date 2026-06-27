'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Lock, Settings, Wrench } from 'lucide-react'
import { TikemWordmark } from '@/components/ui/TikemLogo'

const DEV_EMAILS = ['edward.laguerre+dev@gmail.com', 'edwardlaguerre7@gmail.com']

interface AdminTopNavProps {
  userEmail?: string
  accountInitial?: string
}

interface Tab {
  label: string
  href: string
  badge?: number
}

/**
 * Single top bar for the admin console (mirrors the organizer top nav): tikèm
 * wordmark, primary admin tabs (with live pending-verification badges), then
 * security / settings / account on the right. Replaces the global navbar +
 * left sidebar inside /admin.
 */
export function AdminTopNav({ userEmail, accountInitial = 'A' }: AdminTopNavProps) {
  const pathname = usePathname()
  const [pendingVerifications, setPendingVerifications] = useState(0)
  const [pendingBank, setPendingBank] = useState(0)

  useEffect(() => {
    let active = true
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/admin/platform-counts')
        if (res.ok) {
          const data = await res.json()
          if (!active) return
          setPendingVerifications(data.pendingVerifications || 0)
          setPendingBank(data.pendingBankVerifications || 0)
        }
      } catch {
        /* non-fatal */
      }
    }
    fetchCounts()
    const id = setInterval(fetchCounts, 30000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const isDeveloper = !!userEmail && DEV_EMAILS.includes(userEmail)

  const tabs: Tab[] = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Organizers', href: '/admin/organizers' },
    { label: 'Verifications', href: '/admin/verify', badge: pendingVerifications },
    { label: 'Bank', href: '/admin/bank-verifications', badge: pendingBank },
    { label: 'Events', href: '/admin/events' },
    { label: 'Orders', href: '/admin/orders' },
    { label: 'Payouts', href: '/admin/disbursements' },
    { label: 'Analytics', href: '/admin/analytics' },
  ]

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href))
  const securityActive = pathname?.startsWith('/admin/security')
  const settingsActive = pathname?.startsWith('/admin/settings')
  const devActive = pathname?.startsWith('/admin/dev')

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="flex shrink-0 items-center gap-2 pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
          <TikemWordmark italic className="text-2xl text-white" />
          <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-300">
            Admin
          </span>
        </Link>

        <nav className="scrollbar-hide flex flex-1 items-center gap-1 overflow-x-auto" aria-label="Admin">
          {tabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex h-14 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm font-semibold transition-colors ${
                  active ? 'text-white' : 'text-white/55 hover:text-white/80'
                }`}
              >
                {tab.label}
                {tab.badge ? (
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-400" />}
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          {isDeveloper && (
            <Link
              href="/admin/dev"
              aria-label="Dev tools"
              className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                devActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Wrench className="h-[18px] w-[18px]" />
            </Link>
          )}
          <Link
            href="/admin/security"
            aria-label="Security"
            className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
              securityActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Lock className="h-[18px] w-[18px]" />
          </Link>
          <Link
            href="/admin/settings"
            aria-label="Settings"
            className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
              settingsActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>
          <Link
            href="/profile"
            aria-label="Account"
            className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {accountInitial}
          </Link>
        </div>
      </div>
    </div>
  )
}
