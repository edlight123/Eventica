'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

interface EventTabsProps {
  eventId: string
  ticketCount?: number
}

/**
 * Sticky horizontal tab bar for the per-event command center.
 * Active tab is derived from the current URL — no local state needed.
 */
export function EventTabs({ eventId, ticketCount }: EventTabsProps) {
  const { t } = useTranslation('common')
  const pathname = usePathname()

  const tabs = [
    {
      id: 'overview',
      label: t('organizer.overview', { defaultValue: 'Overview' }),
      href: `/organizer/events/${eventId}`,
      exact: true,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: `/organizer/events/${eventId}/analytics`,
    },
    {
      id: 'tickets',
      label: 'Tickets',
      href: `/organizer/events/${eventId}/tickets`,
    },
    {
      id: 'orders',
      label: 'Orders',
      href: `/organizer/events/${eventId}/orders`,
    },
    {
      id: 'attendees',
      label: t('organizer.attendees', { defaultValue: 'Attendees' }),
      href: `/organizer/events/${eventId}/attendees`,
      count: ticketCount,
    },
    {
      id: 'marketing',
      label: 'Marketing',
      href: `/organizer/events/${eventId}/marketing`,
    },
    {
      id: 'guest-list',
      label: 'Guest list',
      href: `/organizer/events/${eventId}/guest-list`,
    },
    {
      id: 'comps',
      label: 'Comps',
      href: `/organizer/events/${eventId}/comps`,
    },
    {
      id: 'tracking',
      label: 'Tracking',
      href: `/organizer/events/${eventId}/tracking`,
    },
    {
      id: 'earnings',
      label: t('organizer.earnings', { defaultValue: 'Earnings' }),
      href: `/organizer/events/${eventId}/earnings`,
    },
    {
      id: 'check-in',
      label: t('organizer.check_in', { defaultValue: 'Check-in' }),
      href: `/organizer/scan/${eventId}`,
    },
    {
      id: 'staff',
      label: 'Staff',
      href: `/organizer/events/${eventId}/staff`,
    },
  ]

  const isActive = (tab: (typeof tabs)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)

  return (
    <div className="sticky top-14 z-20 border-b border-white/10 bg-[#141414]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Event sections"
          className="-mb-px flex gap-1 overflow-x-auto scrollbar-none"
        >
          {tabs.map((tab) => {
            const active = isActive(tab)
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
                  active
                    ? 'border-brand-600 text-brand-300'
                    : 'border-transparent text-white/55 hover:border-white/20 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      active
                        ? 'text-brand-300'
                        : 'bg-white/8 text-white/55'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
