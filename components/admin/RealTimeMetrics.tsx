'use client'

import { useAdminMetrics } from '@/lib/realtime/AdminRealtimeProvider'
import {
  Users,
  Calendar,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { StatTriplet, type StatItem } from '@/components/ui/StatTriplet'

interface RealTimeMetricsProps {
  usersCount: number
  eventsCount: number
  tickets7d: number
  gmv7d: number
  refunds7d?: number
  refundsAmount7d?: number
  pendingCount?: number
  pendingBankCount?: number
}

export function RealTimeMetrics({
  usersCount: initialUsersCount,
  eventsCount: initialEventsCount,
  tickets7d: initialTickets7d,
  gmv7d: initialGmv7d,
  refunds7d: initialRefunds7d = 0,
  refundsAmount7d = 0,
  pendingCount: initialPendingCount = 0,
  pendingBankCount: initialPendingBankCount = 0
}: RealTimeMetricsProps) {
  // Use real-time data from the provider
  const { metrics: realtimeMetrics } = useAdminMetrics()

  // Use real-time data if available, otherwise fall back to initial props
  const usersCount = realtimeMetrics?.usersCount ?? initialUsersCount
  const eventsCount = realtimeMetrics?.eventsCount ?? initialEventsCount
  const tickets7d = realtimeMetrics?.tickets7d ?? initialTickets7d
  const gmv7d = realtimeMetrics?.gmv7d ?? initialGmv7d
  const refunds7d = realtimeMetrics?.refunds7d ?? initialRefunds7d
  // "Pending Tasks" = verifications + bank verifications, matching the
  // top-nav / command-bar badges (single definition of "needs attention").
  const pendingCount = realtimeMetrics?.pendingCount ?? initialPendingCount
  const pendingBankCount = realtimeMetrics?.pendingBankCount ?? initialPendingBankCount
  const pendingTasks = pendingCount + pendingBankCount

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M HTG`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K HTG`
    }
    return `${amount.toFixed(0)} HTG`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const metrics: StatItem[] = [
    { label: 'Total Users', value: formatNumber(usersCount), icon: Users },
    { label: 'Active Events', value: formatNumber(eventsCount), icon: Calendar },
    { label: 'Tickets Sold (7d)', value: formatNumber(tickets7d), icon: ShoppingBag },
    { label: 'Revenue (7d)', value: formatCurrency(gmv7d), icon: DollarSign, tone: 'brand' },
    { label: 'Refunds (7d)', value: formatNumber(refunds7d), icon: RefreshCw },
    { label: 'Pending Tasks', value: pendingTasks, icon: AlertCircle, tone: pendingTasks > 0 ? 'amber' : 'default' }
  ]

  return (
    <div className="mb-5 sm:mb-6">
      <StatTriplet items={metrics} columns={6} />
    </div>
  )
}