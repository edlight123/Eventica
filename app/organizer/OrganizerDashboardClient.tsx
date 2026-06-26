'use client'

import { useTranslation } from 'react-i18next'
import { ActionCenter } from '@/components/organizer/ActionCenter'
import { SalesSnapshot } from '@/components/organizer/SalesSnapshot'
import { EventPosterCard } from '@/components/organizer/events-manager/EventPosterCard'
import { PayoutsWidget } from '@/components/organizer/PayoutsWidget'
import WelcomeDashboard from '@/components/organizer/WelcomeDashboard'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
      {/* Header */}
      <EditorialHeader
        eyebrow="Organizer"
        title={t('organizer.dashboard_title', { defaultValue: 'Dashboard' })}
        subtitle={t('organizer.dashboard_subtitle', { defaultValue: 'Your events, sales and payouts at a glance' })}
        actions={
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold transition-colors text-sm shadow-sm"
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
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-brand-300">Your events</p>
            <h2 className="mt-1.5 font-display text-[clamp(22px,3.4vw,30px)] leading-[1.04] text-white">{t('organizer.your_events')}</h2>
          </div>
          <Link
            href="/organizer/events"
            className="eyebrow inline-flex shrink-0 items-center gap-1 text-[11px] text-brand-300 transition-colors hover:text-brand-300"
          >
            {t('organizer.view_all_events')} →
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {events.map((event: any) => {
              const stats = eventStatsById[String(event.id)]
              const revenueByCurrencyCents: Record<string, number> = stats?.revenueByCurrencyCents || {}

              return (
                <EventPosterCard
                  key={event.id}
                  event={{
                    id: String(event.id),
                    title: String(event.title || ''),
                    banner_image_url: event.banner_image_url || undefined,
                    start_datetime: String(event.start_datetime || ''),
                    is_published: Boolean(event.is_published),
                    tickets_sold: stats?.ticketsSold ?? (Number(event.tickets_sold) || 0),
                    total_tickets: Number(event.total_tickets || event.max_attendees || 0),
                    city: event.city || undefined,
                    venue_name: event.venue_name || undefined,
                    location_name: event.location_name || undefined,
                    currency: event.currency || undefined,
                    revenueByCurrencyCents,
                    category: event.category || undefined,
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div className="bg-[#141414] rounded-xl border-2 border-dashed border-white/15 p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500/15 to-brand-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarPlus className="w-7 h-7 text-brand-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t('organizer.no_events.title')}</h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              {t('organizer.no_events.description')}
            </p>
            <Link
              href="/organizer/events/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              + {t('organizer.no_events.cta')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
