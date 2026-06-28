'use client'

import { useTranslation } from 'react-i18next'
import { ActionCenter } from '@/components/organizer/ActionCenter'
import { SalesSnapshot } from '@/components/organizer/SalesSnapshot'
import OrganizerEventCard from '@/components/organizer/events-manager/OrganizerEventCard'
import { PayoutsWidget } from '@/components/organizer/PayoutsWidget'
import WelcomeDashboard from '@/components/organizer/WelcomeDashboard'
import { PageHeader, SectionHeader, OrgEmptyState } from '@/components/organizer/ui'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'

interface Alert {
  id: string
  type: 'draft' | 'low-sales' | 'payout' | 'verification'
  title: string
  description: string
  ctaText: string
  ctaHref: string
}

interface OrganizerDashboardClientProps {
  nextEvent: any
  alerts: Alert[]
  hasPayoutSetup: boolean
  payoutWidgetStatus: 'not-setup' | 'setup' | 'pending' | 'active'
  pendingBalance: number
  payoutCurrency: string
  salesData: any
  events: any[]
  eventStatsById: Record<string, { ticketsSold: number; revenueByCurrencyCents: Record<string, number> }>
  isVerified: boolean
  organizerName: string
  hasCreatedEvent: boolean
}

export default function OrganizerDashboardClient({
  nextEvent,
  alerts,
  hasPayoutSetup,
  payoutWidgetStatus,
  pendingBalance,
  payoutCurrency,
  salesData,
  events,
  eventStatsById,
  isVerified,
  organizerName,
  hasCreatedEvent
}: OrganizerDashboardClientProps) {
  const { t } = useTranslation('common')

  // Show welcome dashboard for new organizers (no events yet)
  const isNewOrganizer = !hasCreatedEvent

  if (isNewOrganizer) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <WelcomeDashboard
          organizerName={organizerName}
          hasCreatedEvent={hasCreatedEvent}
          isVerified={isVerified}
          hasPayoutSetup={hasPayoutSetup}
        />
      </div>
    )
  }

  // Dashboard shows a short snapshot — upcoming events first — not the whole catalog.
  const now = Date.now()
  const previewEvents = [...events]
    .sort((a: any, b: any) => {
      const ta = new Date(a?.start_datetime || 0).getTime()
      const tb = new Date(b?.start_datetime || 0).getTime()
      const aUp = ta >= now
      const bUp = tb >= now
      if (aUp && bUp) return ta - tb // soonest upcoming first
      if (aUp) return -1
      if (bUp) return 1
      return tb - ta // then most recent past
    })
    .slice(0, 6)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
      {/* Header */}
      <PageHeader
        eyebrow="Organizer"
        title={t('organizer.dashboard_title', { defaultValue: 'Dashboard' })}
        subtitle={t('organizer.dashboard_subtitle', { defaultValue: 'Your events, sales and payouts at a glance' })}
        actions={
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold transition-colors text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <CalendarPlus className="w-4 h-4" />
            {t('organizer.create_event')}
          </Link>
        }
      />

      {/* Overview — key numbers first */}
      <SalesSnapshot data={salesData} currency={payoutCurrency} />

      {/* Action items + payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className={hasPayoutSetup ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <ActionCenter alerts={alerts} />
        </div>
        {hasPayoutSetup && (
          <div>
            <PayoutsWidget
              status={payoutWidgetStatus}
              pendingBalance={pendingBalance}
              currency={payoutCurrency}
            />
          </div>
        )}
      </div>

      {/* Events Grid */}
      <div>
        <SectionHeader
          eyebrow="Your events"
          title={t('organizer.your_events')}
          className="mb-5"
          actions={
            <Link
              href="/organizer/events"
              className="eyebrow inline-flex shrink-0 items-center gap-1 text-[11px] text-brand-300 transition-colors hover:text-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {t('organizer.view_all_events')} →
            </Link>
          }
        />

        {events.length > 0 ? (
          <div className="space-y-3">
            {previewEvents.map((event: any) => {
              const stats = eventStatsById[String(event.id)]
              const revenueByCurrencyCents: Record<string, number> = stats?.revenueByCurrencyCents || {}

              return (
                <OrganizerEventCard
                  key={event.id}
                  showNeedsAttention={false}
                  event={{
                    id: String(event.id),
                    title: String(event.title || ''),
                    banner_image_url: event.banner_image_url || undefined,
                    start_datetime: String(event.start_datetime || ''),
                    is_published: Boolean(event.is_published),
                    tickets_sold: stats?.ticketsSold ?? (Number(event.tickets_sold) || 0),
                    total_tickets: Number(event.total_tickets || event.max_attendees || 0),
                    city: event.city || undefined,
                    location_name: event.location_name || event.venue_name || undefined,
                    currency: event.currency || undefined,
                    revenueByCurrencyCents,
                    category: event.category || undefined,
                  }}
                />
              )
            })}
          </div>
        ) : (
          <OrgEmptyState
            icon={CalendarPlus}
            title={t('organizer.no_events.title')}
            description={t('organizer.no_events.description')}
            action={
              <Link
                href="/organizer/events/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <CalendarPlus className="w-4 h-4" />
                {t('organizer.no_events.cta')}
              </Link>
            }
          />
        )}
      </div>
    </div>
  )
}
