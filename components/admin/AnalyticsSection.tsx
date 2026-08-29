'use client'

// One analytics area, full width, on its own page — the drill-down target the
// hub cards link to.

import { AdminRevenueAnalytics } from './AdminRevenueAnalytics'
import { UserGrowthAnalytics } from './UserGrowthAnalytics'
import { EventPerformanceAnalytics } from './EventPerformanceAnalytics'
import { ConversionFunnelAnalytics } from './ConversionFunnelAnalytics'
import { OrganizerRankingsAnalytics } from './OrganizerRankingsAnalytics'

export function AnalyticsSection({ section }: { section: string }) {
  switch (section) {
    case 'revenue':
      return <AdminRevenueAnalytics showFilters={true} />
    case 'users':
      return <UserGrowthAnalytics days={30} />
    case 'events':
      return <EventPerformanceAnalytics />
    case 'conversion':
      return <ConversionFunnelAnalytics />
    case 'organizers':
      return <OrganizerRankingsAnalytics />
    default:
      return null
  }
}
