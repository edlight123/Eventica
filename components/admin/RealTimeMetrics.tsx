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

interface MetricCard {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

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

  const metrics: MetricCard[] = [
    {
      title: 'Total Users',
      value: formatNumber(usersCount),
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Active Events',
      value: formatNumber(eventsCount),
      icon: Calendar,
      color: 'green'
    },
    {
      title: 'Tickets Sold (7d)',
      value: formatNumber(tickets7d),
      icon: ShoppingBag,
      color: 'purple'
    },
    {
      title: 'Revenue (7d)',
      value: formatCurrency(gmv7d),
      icon: DollarSign,
      color: 'teal'
    },
    {
      title: 'Refunds (7d)',
      value: formatNumber(refunds7d),
      icon: RefreshCw,
      color: 'orange'
    },
    {
      title: 'Pending Tasks',
      value: pendingTasks,
      icon: AlertCircle,
      color: 'red'
    }
  ]

  return (
    <div className="mb-5 sm:mb-6 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="label-mono truncate text-[11px] font-medium uppercase tracking-wide text-white/50 sm:text-xs">
                  {metric.title}
                </span>
                <Icon className="h-4 w-4 shrink-0 text-brand-300 opacity-70" />
              </div>
              <div className="font-mono text-2xl font-bold leading-none text-white tabular-nums sm:text-3xl">
                {metric.value}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}