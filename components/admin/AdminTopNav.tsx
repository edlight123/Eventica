'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, Settings, Wrench } from 'lucide-react'
import { TikemWordmark } from '@/components/ui/TikemLogo'
import { useAdminPendingCount } from '@/lib/realtime/AdminRealtimeProvider'

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
  // Single source of truth: the AdminRealtimeProvider (10s poll) feeds the
  // combined "needs attention" figure — no independent polling here.
  const { total: pendingTotal } = useAdminPendingCount()

  const isDeveloper = !!userEmail && DEV_EMAILS.includes(userEmail)

  const tabs: Tab[] = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'People', href: '/admin/users' },
    { label: 'Verifications', href: '/admin/verify', badge: pendingTotal },
    { label: 'Events', href: '/admin/events' },
    { label: 'Orders', href: '/admin/orders' },
    { label: 'Payouts', href: '/admin/disbursements' },
    { label: 'Analytics', href: '/admin/analytics' },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    // Payout release settings live under /admin/payouts, so keep the Payouts tab lit there too.
    if (href === '/admin/disbursements') {
      return pathname?.startsWith('/admin/disbursements') || pathname?.startsWith('/admin/payouts')
    }
    return pathname?.startsWith(href)
  }
  const securityActive = pathname?.startsWith('/admin/security')
  const settingsActive = pathname?.startsWith('/admin/settings')
  const devActive = pathname?.startsWith('/admin/dev')

  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="flex shrink-0 items-center gap-2 pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
          <TikemWordmark italic className="text-2xl text-white" />
          <span className="label-mono rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-300">
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
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white font-mono tabular-nums">
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
                devActive ? 'bg-[#0a0a0a] text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Wrench className="h-[18px] w-[18px]" />
            </Link>
          )}
          <Link
            href="/admin/security"
            aria-label="Security"
            className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
              securityActive ? 'bg-[#0a0a0a] text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <Lock className="h-[18px] w-[18px]" />
          </Link>
          <Link
            href="/admin/settings"
            aria-label="Settings"
            className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
              settingsActive ? 'bg-[#0a0a0a] text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
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
