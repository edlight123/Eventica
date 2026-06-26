import Link from 'next/link'
import { AdminRevenueAnalytics } from '@/components/admin/AdminRevenueAnalytics'
import { UserGrowthAnalytics } from '@/components/admin/UserGrowthAnalytics'
import { EventPerformanceAnalytics } from '@/components/admin/EventPerformanceAnalytics'
import { ConversionFunnelAnalytics } from '@/components/admin/ConversionFunnelAnalytics'
import { OrganizerRankingsAnalytics } from '@/components/admin/OrganizerRankingsAnalytics'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { AdminAnalyticsTabs } from '@/components/admin/AdminAnalyticsTabs'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

export const revalidate = 120

export default async function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      <AdminBreadcrumbs items={[{ label: 'Analytics' }]} />
      
      <EditorialHeader
        eyebrow="Platform"
        title="Platform Analytics"
        subtitle="Comprehensive insights and performance metrics"
        className="mb-5 sm:mb-6"
      />

      {/* Tabbed Analytics Interface */}
      <AdminAnalyticsTabs />
    </div>
  )
}
