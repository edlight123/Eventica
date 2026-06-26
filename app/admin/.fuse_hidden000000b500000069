import { 
  getPlatformCounts, 
  get7DayMetrics, 
  getRecentEvents, 
  getPendingVerifications 
} from '@/lib/firestore/admin'
import { getRecentAdminActivities } from '@/lib/admin/audit-log'
import { AdminDashboardClient } from './AdminDashboardClient'

export const revalidate = 30

export default async function AdminDashboard() {
  // Fetch platform statistics using Firestore
  const [platformCounts, metrics7d, recentEvents, pendingVerifications, recentActivities] = await Promise.all([
    getPlatformCounts(),
    get7DayMetrics(),
    getRecentEvents(5),
    getPendingVerifications(3),
    getRecentAdminActivities(10)
  ])

  const { usersCount, eventsCount, pendingVerifications: pendingCount } = platformCounts
  const pendingBankCount = (platformCounts as any).pendingBankVerifications || 0
  const { gmv7d, tickets7d, refunds7d, refundsAmount7d } = metrics7d

  // Serialize all data before passing to client component
  const serializeData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj
    if (obj.toDate && typeof obj.toDate === 'function') return obj.toDate().toISOString()
    if (Array.isArray(obj)) return obj.map(serializeData)
    
    const serialized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeData(obj[key])
      }
    }
    return serialized
  }

  const serializedPendingVerifications = serializeData(pendingVerifications)
  const serializedRecentEvents = serializeData(recentEvents)
  const serializedRecentActivities = serializeData(recentActivities)

  return (
    <AdminDashboardClient
      usersCount={usersCount}
      eventsCount={eventsCount}
      tickets7d={tickets7d}
      gmv7d={gmv7d}
      refunds7d={refunds7d}
      refundsAmount7d={refundsAmount7d}
      pendingCount={pendingCount}
      pendingBankCount={pendingBankCount}
      pendingVerifications={serializedPendingVerifications}
      recentEvents={serializedRecentEvents}
      recentActivities={serializedRecentActivities}
    />
  )
}
