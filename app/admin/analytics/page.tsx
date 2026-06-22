import Link from 'next/link'
import { AdminRevenueAnalytics } from '@/components/admin/AdminRevenueAnalytics'
import { UserGrowthAnalytics } from '@/components/admin/UserGrowthAnalytics'
import { EventPerformanceAnalytics } from '@/components/admin/EventPerformanceAnalytics'
import { ConversionFunnelAnalytics } from '@/components/admin/ConversionFunnelAnalytics'
import { OrganizerRankingsAnalytics } from '@/components/admin/OrganizerRankingsAnalytics'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { AdminAnalyticsTabs } from '@/components/admin/AdminAnalyticsTabs'

export const revalidate = 120

export default async function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <AdminBreadcrumbs items={[{ label: 'Analytics' }]} />
      
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">Platform Analytics</h1>
        <p className="text-sm text-gray-600 mt-2">Comprehensive insights and performance metrics</p>
      </div>

      {/* Tabbed Analytics Interface */}
      <AdminAnalyticsTabs />
    </div>
  )
}
