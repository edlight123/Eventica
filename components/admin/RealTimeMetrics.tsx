'use client'

import { useState, useEffect } from 'react'
import { useAdminMetrics, useSystemStatus } from '@/lib/realtime/AdminRealtimeProvider'
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  ShoppingBag,
  Zap,
  RefreshCw,
  AlertCircle,
  Clock
} from 'lucide-react'

interface MetricCard {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period: string
  }
  icon: React.ComponentType<{ className?: string }>
  color: string
  trend?: number[]
  loading?: boolean
}

interface RealTimeMetricsProps {
  usersCount: number
  eventsCount: number
  tickets7d: number
  gmv7d: number
  refunds7d?: number
  refundsAmount7d?: number
  pendingCount?: number
}

export function RealTimeMetrics({
  usersCount: initialUsersCount,
  eventsCount: initialEventsCount,
  tickets7d: initialTickets7d,
  gmv7d: initialGmv7d,
  refunds7d: initialRefunds7d = 0,
  refundsAmount7d = 0,
  pendingCount: initialPendingCount = 0
}: RealTimeMetricsProps) {
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Use real-time data from the provider
  const { metrics: realtimeMetrics, isConnected } = useAdminMetrics()
  const { systemStatus } = useSystemStatus()

  // Use real-time data if available, otherwise fall back to initial props
  const usersCount = realtimeMetrics?.usersCount ?? initialUsersCount
  const eventsCount = realtimeMetrics?.eventsCount ?? initialEventsCount
  const tickets7d = realtimeMetrics?.tickets7d ?? initialTickets7d
  const gmv7d = realtimeMetrics?.gmv7d ?? initialGmv7d
  const refunds7d = realtimeMetrics?.refunds7d ?? initialRefunds7d
  const pendingCount = realtimeMetrics?.pendingCount ?? initialPendingCount

  // Update timestamp when real-time data changes
  useEffect(() => {
    if (realtimeMetrics?.timestamp) {
      setLastUpdated(new Date(realtimeMetrics.timestamp))
    }
  }, [realtimeMetrics])

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
      change: {
        value: 12.5,
        type: 'increase',
        period: '7d'
      },
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Active Events',
      value: formatNumber(eventsCount),
      change: {
        value: 8.2,
        type: 'increase',
        period: '7d'
      },
      icon: Calendar,
      color: 'green'
    },
    {
      title: 'Tickets Sold (7d)',
      value: formatNumber(tickets7d),
      change: {
        value: 23.1,
        type: 'increase',
        period: 'vs prev 7d'
      },
      icon: ShoppingBag,
      color: 'purple'
    },
    {
      title: 'Revenue (7d)',
      value: formatCurrency(gmv7d),
      change: {
        value: 15.8,
        type: 'increase',
        period: 'vs prev 7d'
      },
      icon: DollarSign,
      color: 'teal'
    },
    {
      title: 'Refunds (7d)',
      value: formatNumber(refunds7d),
      change: {
        value: 5.2,
        type: 'decrease',
        period: 'vs prev 7d'
      },
      icon: RefreshCw,
      color: 'orange'
    },
    {
      title: 'Pending Tasks',
      value: pendingCount,
      change: {
        value: 2,
        type: 'decrease',
        period: 'since yesterday'
      },
      icon: AlertCircle,
      color: 'red'
    }
  ]

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }

  // All KPI icon chips share one brand-tinted style for a calm, cohesive strip.
  // (The per-metric trend arrows below remain semantic green/red.)
  const getColorClasses = (_color: string) => 'bg-brand-50 text-brand-700 ring-brand-100'

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow text-brand-600">Live</p>
          <h2 className="mt-1.5 font-display text-[clamp(20px,3vw,26px)] leading-[1.04] text-gray-900">
            Real-time Metrics
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <Clock className="w-4 h-4" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          const colorClasses = getColorClasses(metric.color)
          
          return (
            <div
              key={metric.title}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ring-1 ${colorClasses}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {metric.change && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    metric.change.type === 'increase' 
                      ? 'text-green-600' 
                      : metric.change.type === 'decrease'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {metric.change.type === 'increase' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : metric.change.type === 'decrease' ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : null}
                    {metric.change.value}%
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {metric.title}
                </div>
                {metric.change && (
                  <div className="text-xs text-gray-400">
                    {metric.change.period}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Status Indicators */}
      <div className="mt-6 flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'System Online' : 'Disconnected'}
            </span>
          </div>
          {systemStatus?.services && (
            <>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${systemStatus.services.payments ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">Payment Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${systemStatus.services.analytics ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">Analytics Engine</span>
              </div>
            </>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {isConnected ? 'All systems operational' : 'Connection issue detected'}
        </div>
      </div>
    </div>
  )
}