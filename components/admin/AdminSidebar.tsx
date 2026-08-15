'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, Settings, Wrench } from 'lucide-react'
import { TikemWordmark } from '@/components/ui/TikemLogo'
import { useAdminQueues } from '@/lib/realtime/AdminRealtimeProvider'
// queue-keys, NOT queue-summary: the latter imports firebase-admin, which must
// never reach the client bundle.
import { RAIL_GROUPS, railStat } from '@/lib/admin/queue-keys'
import { formatAge, ageClass } from '@/lib/admin/age'

const DEV_EMAILS = ['edward.laguerre+dev@gmail.com', 'edwardlaguerre7@gmail.com']

const BROWSE = [
  { label: 'People', href: '/admin/users' },
  { label: 'Events', href: '/admin/events' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Analytics', href: '/admin/analytics' },
]

function RailLink({
  href,
  label,
  active,
  children,
}: {
  href: string
  label: string
  active: boolean
  children?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex h-9 items-center justify-between gap-2 rounded-md px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        active
          ? 'bg-white/[0.06] font-semibold text-brand-300'
          : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      <span className="font-grotesk truncate">{label}</span>
      {children}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="label-mono px-3 pb-1.5 pt-5 text-[10px] uppercase tracking-wider text-white/40">
      {children}
    </div>
  )
}

/**
 * The admin rail. Splits QUEUES (things needing a decision) from BROWSE (things
 * you look up) — the distinction the old seven-tab bar flattened.
 *
 * Each queue shows `count · oldest`, because a count alone cannot tell twelve
 * items filed this morning from two filed last week.
 */
export function AdminSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const { queues } = useAdminQueues()

  const isDeveloper = !!userEmail && DEV_EMAILS.includes(userEmail)
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : Boolean(pathname?.startsWith(href))

  return (
    <nav
      aria-label="Admin"
      className="flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0a0a0a] px-2 py-3"
    >
      <Link
        href="/admin"
        className="mb-2 flex items-center gap-2 rounded px-3 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <TikemWordmark italic className="text-2xl text-white" />
        <span className="label-mono text-[10px] font-bold uppercase tracking-wider text-brand-300">Admin</span>
      </Link>

      <RailLink href="/admin" label="Needs you" active={isActive('/admin')} />

      <SectionLabel>Queues</SectionLabel>
      {RAIL_GROUPS.map((group) => {
        const stat = queues ? railStat(queues, group) : null
        // Three distinct states: not loaded yet, read failed, genuinely clear.
        const unreadable = queues !== null && stat === null
        return (
          <RailLink key={group.key} href={group.href} label={group.label} active={isActive(group.href)}>
            {stat && stat.count > 0 ? (
              <span className="label-mono shrink-0 text-[11px] tabular-nums">
                <span className="text-white/70">{stat.count}</span>
                {stat.oldestAt && (
                  <>
                    <span className="text-white/25"> · </span>
                    <span className={ageClass(stat.oldestAt)}>{formatAge(stat.oldestAt)}</span>
                  </>
                )}
              </span>
            ) : unreadable ? (
              <span
                className="label-mono shrink-0 text-[11px] text-white/25"
                title="Count unavailable — this queue could not be read"
              >
                —
              </span>
            ) : null}
          </RailLink>
        )
      })}

      <SectionLabel>Browse</SectionLabel>
      {BROWSE.map((item) => (
        <RailLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
      ))}

      <div className="mt-auto border-t border-white/10 pt-2">
        <RailLink href="/admin/security" label="Security" active={isActive('/admin/security')}>
          <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </RailLink>
        <RailLink href="/admin/settings" label="Settings" active={isActive('/admin/settings')}>
          <Settings className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </RailLink>
        {isDeveloper && (
          <RailLink href="/admin/dev" label="Dev" active={isActive('/admin/dev')}>
            <Wrench className="h-3.5 w-3.5 shrink-0 text-white/40" />
          </RailLink>
        )}
      </div>
    </nav>
  )
}
