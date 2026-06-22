'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Users, 
  Award,
  BarChart3
} from 'lucide-react'
import { AdminRevenueAnalytics } from './AdminRevenueAnalytics'
import { UserGrowthAnalytics } from './UserGrowthAnalytics'
import { EventPerformanceAnalytics } from './EventPerformanceAnalytics'
import { ConversionFunnelAnalytics } from './ConversionFunnelAnalytics'
import { OrganizerRankingsAnalytics } from './OrganizerRankingsAnalytics'

type TabId = 'overview' | 'revenue' | 'users' | 'events' | 'conversion' | 'organizers'

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'users', label: 'User Growth', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'conversion', label: 'Conversion', icon: TrendingUp },
  { id: 'organizers', label: 'Organizers', icon: Award }
]

export function AdminAnalyticsTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  // Track which tabs have been visited to avoid re-mounting components
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(() => new Set<TabId>(['overview']))
  
  // Mark tab as visited when it becomes active
  useEffect(() => {
    if (!visitedTabs.has(activeTab)) {
      setVisitedTabs(prev => {
        const newSet = new Set<TabId>(Array.from(prev))
        newSet.add(activeTab)
        return newSet
      })
    }
  }, [activeTab, visitedTabs])

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-1 min-w-max" aria-label="Analytics tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content - Only render tabs that have been visited (lazy loading) */}
      <div className="min-h-[500px]">
        {/* Overview Tab */}
        <div className={activeTab === 'overview' ? '' : 'hidden'}>
          {visitedTabs.has('overview') && (
            <div className="space-y-8">
              {/* Quick Stats Overview */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Overview</h2>
                <AdminRevenueAnalytics showFilters={false} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth Summary */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent User Growth</h2>
                  <UserGrowthAnalytics days={7} />
                </div>

                {/* Top Events */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Events</h2>
                  <EventPerformanceAnalytics />
                </div>
              </div>

              {/* Conversion & Organizers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
                  <ConversionFunnelAnalytics />
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Organizers</h2>
                  <OrganizerRankingsAnalytics />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Revenue Tab - Only mount when first visited */}
        <div className={activeTab === 'revenue' ? '' : 'hidden'}>
          {visitedTabs.has('revenue') && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Analytics (Multi-Currency)</h2>
              <AdminRevenueAnalytics showFilters={true} />
            </div>
          )}
        </div>

        {/* Users Tab - Only mount when first visited */}
        <div className={activeTab === 'users' ? '' : 'hidden'}>
          {visitedTabs.has('users') && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Growth Metrics</h2>
              <UserGrowthAnalytics days={30} />
            </div>
          )}
        </div>

        {/* Events Tab - Only mount when first visited */}
        <div className={activeTab === 'events' ? '' : 'hidden'}>
          {visitedTabs.has('events') && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Performance</h2>
              <EventPerformanceAnalytics />
            </div>
          )}
        </div>

        {/* Conversion Tab - Only mount when first visited */}
        <div className={activeTab === 'conversion' ? '' : 'hidden'}>
          {visitedTabs.has('conversion') && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversion Funnel Analysis</h2>
              <ConversionFunnelAnalytics />
            </div>
          )}
        </div>

        {/* Organizers Tab - Only mount when first visited */}
        <div className={activeTab === 'organizers' ? '' : 'hidden'}>
          {visitedTabs.has('organizers') && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Organizer Performance Rankings</h2>
              <OrganizerRankingsAnalytics />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
