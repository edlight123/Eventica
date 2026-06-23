'use client'

import { useTranslation } from 'react-i18next'
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader'
import { WorkQueueCard } from '@/components/admin/WorkQueueCard'
import { AdminDashboardQuickActions } from '@/components/admin/AdminDashboardQuickActions'
import { RealTimeMetrics } from '@/components/admin/RealTimeMetrics'
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed'
import { RealtimeConnectionStatus } from '@/components/admin/RealtimeConnectionStatus'
import { ShieldCheck, AlertCircle, Calendar } from 'lucide-react'

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header with Connection Status */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <AdminDashboardHeader />
        <RealtimeConnectionStatus />
      </div>

      {/* KPI strip */}
      <RealTimeMetrics
        usersCount={usersCount}
        eventsCount={eventsCount}
        tickets7d={tickets7d}
        gmv7d={gmv7d}
        refunds7d={refunds7d}
        refundsAmount7d={refundsAmount7d}
        pendingCount={pendingCount}
      />

      {/* Work area: activity feed (2/3) + stacked queues (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:items-start mb-5 sm:mb-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <AdminActivityFeed recentActivities={recentActivities} />
        </div>

        {/* Right rail: work queues + note */}
        <div className="space-y-4 sm:space-y-5 order-1 lg:order-2">
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
            iconColor="text-amber-700"
            iconBg="bg-amber-50"
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

          {/* Compact info note */}
          <div className="bg-brand-50 rounded-xl border border-brand-100 p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-semibold text-brand-900 text-sm">
                  {t('dashboard.daily_stats_title')}
                </h3>
                <p className="text-xs text-brand-700 mt-1">
                  {t('dashboard.daily_stats_updated')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions — compact launchpad (primary nav lives in the sidebar) */}
      <AdminDashboardQuickActions
        pendingVerifications={pendingCount}
        pendingBankVerifications={pendingBankCount}
        urgentTasks={pendingCount + pendingBankCount}
      />
    </div>
  )
}
