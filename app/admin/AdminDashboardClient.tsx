'use client'

import { useTranslation } from 'react-i18next'
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader'
import { AdminKpiGrid } from '@/components/admin/AdminKpiGrid'
import { WorkQueueCard } from '@/components/admin/WorkQueueCard'
import { RecentActivityTimeline } from '@/components/admin/RecentActivityTimeline'
import { AdminDashboardQuickActions } from '@/components/admin/AdminDashboardQuickActions'
import { RealTimeMetrics } from '@/components/admin/RealTimeMetrics'
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed'
import { RealtimeConnectionStatus } from '@/components/admin/RealtimeConnectionStatus'
import { ShieldCheck, AlertCircle, Calendar, BarChart3, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface AdminDashboardClientProps {
  usersCount: number
  eventsCount: number
  tickets7d: number
  gmv7d: number
  refunds7d: number
  refundsAmount7d: number
  pendingCount: number
  pendingBankCount: number
  pendingVerifications: any[]
  recentEvents: any[]
  recentActivities: any[]
}

export function AdminDashboardClient({
  usersCount,
  eventsCount,
  tickets7d,
  gmv7d,
  refunds7d,
  refundsAmount7d,
  pendingCount,
  pendingBankCount,
  pendingVerifications,
  recentEvents,
  recentActivities
}: AdminDashboardClientProps) {
  const { t } = useTranslation('admin')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header with Connection Status */}
      <div className="flex items-start justify-between mb-6 sm:mb-8">
        <AdminDashboardHeader />
        <RealtimeConnectionStatus />
      </div>

      {/* Real-time Metrics */}
      <RealTimeMetrics
        usersCount={usersCount}
        eventsCount={eventsCount}
        tickets7d={tickets7d}
        gmv7d={gmv7d}
        refunds7d={refunds7d}
        refundsAmount7d={refundsAmount7d}
        pendingCount={pendingCount}
      />

      {/* Work Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Pending Verifications Queue */}
        <WorkQueueCard
          title={t('dashboard.pending_verifications')}
          count={pendingCount}
          items={pendingVerifications.map((v: any) => ({
            id: v.id,
            title: v.businessName || t('dashboard.unknown_business'),
            subtitle: v.idType || t('dashboard.id_verification'),
            timestamp: v.createdAt,
            badge: {
              label: t('dashboard.status_pending'),
              variant: 'warning' as const
            }
          }))}
          icon={ShieldCheck}
          iconColor="text-yellow-700"
          iconBg="bg-yellow-50"
          viewAllHref="/admin/verify"
          emptyMessage={t('dashboard.no_pending')}
        />

        {/* Recent Events Queue */}
        <WorkQueueCard
          title={t('dashboard.recent_events')}
          count={eventsCount}
          items={recentEvents.map((e: any) => {
            const legacyStatus = String(e?.status || '').trim().toLowerCase()
            const isPublished =
              e?.isPublished === true ||
              e?.is_published === true ||
              legacyStatus === 'published'

            // Build location string
            const locationParts = []
            if (e.venueName) locationParts.push(e.venueName)
            if (e.commune) locationParts.push(e.commune)
            if (e.city) locationParts.push(e.city)
            const location = locationParts.length > 0 ? locationParts.join(', ') : t('dashboard.location_tbd')
            
            // Format price
            const currency = e.currency || 'HTG'
            const price = e.ticketPrice != null && e.ticketPrice > 0
              ? `${e.ticketPrice.toFixed(2)} ${currency}`
              : t('dashboard.free')
            
            return {
              id: e.id,
              title: e.title || t('dashboard.untitled_event'),
              subtitle: `${location} • ${price}`,
              timestamp: e.createdAt,
              badge: isPublished ? {
                label: t('dashboard.status_published'),
                variant: 'success' as const
              } : {
                label: t('dashboard.status_draft'),
                variant: 'neutral' as const
              }
            }
          })}
          icon={Calendar}
          iconColor="text-brand-700"
          iconBg="bg-brand-50"
          viewAllHref="/admin/events"
          emptyMessage={t('dashboard.no_events_yet')}
        />
      </div>

      {/* Quick Actions — secondary launchpad (primary nav lives in the sidebar) */}
      <AdminDashboardQuickActions
        pendingVerifications={pendingCount}
        pendingBankVerifications={pendingBankCount}
        urgentTasks={pendingCount + pendingBankCount}
      />

      {/* Enhanced Activity and Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Enhanced Activity Feed */}
        <AdminActivityFeed recentActivities={recentActivities} />

        {/* Notes Card */}
        <div className="bg-brand-50 rounded-xl border border-brand-100 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-brand-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-brand-900 mb-2 text-sm sm:text-base">
                {t('dashboard.daily_stats_title')}
              </h3>
              <div className="text-xs sm:text-sm text-brand-800 space-y-2">
                <p className="hidden sm:block">
                  {t('dashboard.daily_stats_desc')}
                </p>
                <p className="font-medium">{t('dashboard.daily_stats_updated')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                  <li>{t('dashboard.daily_stats_gmv')}</li>
                  <li>{t('dashboard.daily_stats_tickets')}</li>
                  <li>{t('dashboard.daily_stats_refunds')}</li>
                </ul>
                <p className="text-xs text-brand-700 hidden sm:block mt-3">
                  {t('dashboard.daily_stats_docs')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
