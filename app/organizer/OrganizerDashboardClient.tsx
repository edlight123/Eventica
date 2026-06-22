'use client'

import { useTranslation } from 'react-i18next'
import { NextEventHero } from '@/components/organizer/NextEventHero'
import { ActionCenter } from '@/components/organizer/ActionCenter'
import { SalesSnapshot } from '@/components/organizer/SalesSnapshot'
import { OrganizerEventCard } from '@/components/organizer/OrganizerEventCard'
import { PayoutsWidget } from '@/components/organizer/PayoutsWidget'
import WelcomeDashboard from '@/components/organizer/WelcomeDashboard'
import Link from 'next/link'
import { CalendarPlus, DollarSign, CalendarDays, Wallet, BarChart3, QrCode, TicketPercent } from 'lucide-react'

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Next Event Hero */}
      {nextEvent && (
        <div className="mb-6">
          <NextEventHero event={nextEvent} />
        </div>
      )}

      {/* Action Center + Payouts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Action Center */}
        <div className={hasPayoutSetup ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <ActionCenter alerts={alerts} />
        </div>

        {/* Payouts Widget */}
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

      {/* Sales Snapshot */}
      <div className="mb-6">
        <SalesSnapshot data={salesData} currency={payoutCurrency} />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/organizer/earnings"
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                <DollarSign className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">View Earnings</div>
                <div className="text-xs text-gray-500">Track event revenue & fees</div>
              </div>
            </div>
          </Link>

          <Link
            href="/organizer/events"
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <CalendarDays className="w-5 h-5 text-brand-700" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Manage Events</div>
                <div className="text-xs text-gray-500">Edit & view all events</div>
              </div>
            </div>
          </Link>

          <Link
            href="/organizer/settings/payouts"
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Wallet className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Payouts</div>
                <div className="text-xs text-gray-500">Setup & request withdrawals</div>
              </div>
            </div>
          </Link>

          <Link
            href="/organizer/events/new"
            className="bg-gradient-to-br from-brand-500 to-brand-700 p-4 rounded-xl hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <CalendarPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-white">Create Event</div>
                <div className="text-xs text-white/80">Start selling tickets</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Discovery Links */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">{t('organizer.tools.title')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/organizer/analytics"
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                <BarChart3 className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{t('organizer.tools.analytics.title')}</div>
                <div className="text-xs text-gray-500">{t('organizer.tools.analytics.description')}</div>
              </div>
            </div>
          </Link>

          <Link
            href="/organizer/scan"
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <QrCode className="w-5 h-5 text-brand-700" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{t('organizer.tools.scan.title')}</div>
                <div className="text-xs text-gray-500">{t('organizer.tools.scan.description')}</div>
              </div>
            </div>
          </Link>

          <Link
            href="/organizer/promo-codes"
            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <TicketPercent className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{t('organizer.tools.promoCodes.title')}</div>
                <div className="text-xs text-gray-500">{t('organizer.tools.promoCodes.description')}</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Events Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-[clamp(22px,3.4vw,30px)] leading-[1.04] text-gray-900">{t('organizer.your_events')}</h2>
            <Link
              href="/organizer/events"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline"
            >
              {t('organizer.view_all_events')} →
            </Link>
          </div>
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            + {t('organizer.create_event')}
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {events.map((event: any) => {
              const stats = eventStatsById[String(event.id)]
              const ticketsSold = stats?.ticketsSold || 0
              const revenueByCurrencyCents = stats?.revenueByCurrencyCents || {}
              const revenue = Object.values(revenueByCurrencyCents).reduce((sum, cents) => sum + (cents || 0), 0)
              
              return (
                <OrganizerEventCard
                  key={event.id}
                  event={{
                    ...event,
                    ticketsSold,
                    revenue,
                    revenueByCurrencyCents,
                    capacity: event.total_tickets || event.max_attendees || 0
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-50 to-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarPlus className="w-7 h-7 text-brand-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('organizer.no_events.title')}</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
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
