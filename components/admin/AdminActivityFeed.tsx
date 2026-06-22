'use client'

import { useState, useEffect } from 'react'
import { useAdminActivities } from '@/lib/realtime/AdminRealtimeProvider'
import { 
  Activity,
  User,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  ChevronRight,
  Filter,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface AdminActivity {
  id: string
  type: 'user_action' | 'verification' | 'payment' | 'event' | 'security' | 'system'
  title: string
  description: string
  timestamp: string
  actor?: {
    name: string
    email?: string
    role: string
  }
  metadata?: {
    amount?: number
    currency?: string
    eventId?: string
    userId?: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }
  link?: string
}

interface AdminActivityFeedProps {
  recentActivities?: any[]
  maxItems?: number
}

export function AdminActivityFeed({ 
  recentActivities = [], 
  maxItems = 20 
}: AdminActivityFeedProps) {
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<AdminActivity[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')

  // Use real-time activities from the provider
  const { activities: realtimeActivities, isConnected } = useAdminActivities()

  // Transform and merge real-time activities with prop activities
  useEffect(() => {
    const transformedActivities: AdminActivity[] = []

    // Add real-time activities first (prioritize them)
    if (realtimeActivities && realtimeActivities.length > 0) {
      realtimeActivities.forEach(activity => {
        transformedActivities.push({
          id: activity.id,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          timestamp: activity.timestamp,
          actor: activity.actor,
          metadata: activity.metadata
        })
      })
    }

    // Add any prop activities that aren't duplicates
    recentActivities.forEach((activity, index) => {
      if (activity && typeof activity === 'object') {
        const isDuplicate = transformedActivities.some(a => a.id === `prop-${index}`)
        if (!isDuplicate) {
          transformedActivities.push({
            id: `prop-${index}`,
            type: 'event',
            title: activity.action || 'Activity',
            description: activity.details || 'Recent platform activity',
            timestamp: activity.timestamp || new Date().toISOString(),
            actor: activity.actor ? {
              name: activity.actor.name || 'Unknown',
              email: activity.actor.email,
              role: activity.actor.role || 'user'
            } : undefined
          })
        }
      }
    })

    // Sort by timestamp (most recent first) and limit
    transformedActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    setActivities(transformedActivities.slice(0, maxItems))
  }, [realtimeActivities, recentActivities, maxItems])

  useEffect(() => {
    if (filter === 'all') {
      setFilteredActivities(activities)
    } else {
      setFilteredActivities(activities.filter(activity => activity.type === filter))
    }
  }, [activities, filter])

  const getActivityIcon = (type: string, severity?: string) => {
    switch (type) {
      case 'verification':
        return Shield
      case 'payment':
        return DollarSign
      case 'event':
        return Calendar
      case 'security':
        return AlertTriangle
      case 'user_action':
        return User
      case 'system':
        return CheckCircle
      default:
        return Activity
    }
  }

  const getActivityColor = (type: string, severity?: string) => {
    if (severity === 'critical') return 'text-red-600 bg-red-50'
    if (severity === 'high') return 'text-amber-600 bg-amber-50'
    
    switch (type) {
      case 'verification':
        return 'text-brand-700 bg-brand-50'
      case 'payment':
        return 'text-green-600 bg-green-50'
      case 'event':
        return 'text-brand-700 bg-brand-50'
      case 'security':
        return 'text-red-600 bg-red-50'
      case 'user_action':
        return 'text-brand-700 bg-brand-50'
      case 'system':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-brand-700 bg-brand-50'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const filterOptions = [
    { value: 'all', label: 'All Activities', count: activities.length },
    { value: 'verification', label: 'Verifications', count: activities.filter(a => a.type === 'verification').length },
    { value: 'payment', label: 'Payments', count: activities.filter(a => a.type === 'payment').length },
    { value: 'security', label: 'Security', count: activities.filter(a => a.type === 'security').length },
    { value: 'event', label: 'Events', count: activities.filter(a => a.type === 'event').length },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-600" />
              Admin Activity Feed
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Recent platform activities and admin actions
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title={`Switch to ${viewMode === 'compact' ? 'detailed' : 'compact'} view`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh activities"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === option.value
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {option.label}
              {option.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === option.value ? 'bg-brand-100' : 'bg-gray-200'
                }`}>
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type, activity.metadata?.severity)
              const colorClasses = getActivityColor(activity.type, activity.metadata?.severity)
              
              return (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                          {activity.link && (
                            <Link
                              href={activity.link}
                              className="text-brand-600 hover:text-brand-700"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {activity.description}
                      </p>
                      
                      {viewMode === 'detailed' && (
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          {activity.actor && (
                            <span>
                              by {activity.actor.name} ({activity.actor.role})
                            </span>
                          )}
                          {activity.metadata?.amount && (
                            <span>
                              {activity.metadata.amount.toLocaleString()} {activity.metadata.currency}
                            </span>
                          )}
                          {activity.metadata?.severity && (
                            <span className={`px-2 py-0.5 rounded-full ${
                              activity.metadata.severity === 'critical' 
                                ? 'bg-red-100 text-red-700'
                                : activity.metadata.severity === 'high'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {activity.metadata.severity}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}