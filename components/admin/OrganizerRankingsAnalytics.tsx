'use client'

import { useEffect, useState } from 'react'
import { Crown, Star, Ticket, Calendar, Award } from 'lucide-react'
import Link from 'next/link'

interface OrganizerData {
  id: string
  name: string
  email: string
  created_at: string
  eventsCount: number
  totalTickets: number
  totalFavorites: number
  avgRating: number
}

export function OrganizerRankingsAnalytics() {
  const [organizers, setOrganizers] = useState<OrganizerData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics-data?type=organizers&limit=10')
      .then(r => r.json())
      .then(result => {
        const organizersData = result.data || result
        setOrganizers(Array.isArray(organizersData) ? organizersData : [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load organizer rankings:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (organizers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No organizer data available
      </div>
    )
  }

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600'
      case 2:
        return 'from-gray-300 to-gray-500'
      case 3:
        return 'from-amber-400 to-amber-600'
      default:
        return 'from-brand-400 to-brand-600'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Crown className="w-6 h-6 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900">Top Organizers</h3>
        <span className="text-sm text-gray-500">(by ticket sales)</span>
      </div>

      <div className="space-y-3">
        {organizers.map((organizer, index) => {
          const rank = index + 1
          const isTopThree = rank <= 3

          return (
            <div
              key={organizer.id}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                isTopThree
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-gray-200 hover:border-brand-300'
              }`}
            >
              {/* Rank Badge */}
              <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${getMedalColor(rank)} rounded-full flex items-center justify-center shadow-lg`}>
                {isTopThree ? (
                  <Crown className="w-6 h-6 text-white" />
                ) : (
                  <span className="text-white font-bold text-lg">#{rank}</span>
                )}
              </div>

              {/* Organizer Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/organizer/profile/${organizer.id}`}
                    className="font-semibold text-gray-900 hover:text-brand-600 transition-colors"
                  >
                    {organizer.name}
                  </Link>
                  {isTopThree && (
                    <Award className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">{organizer.email}</div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {organizer.totalTickets.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">tickets</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {organizer.eventsCount}
                    </span>
                    <span className="text-xs text-gray-500">events</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {organizer.avgRating > 0 ? organizer.avgRating.toFixed(1) : 'N/A'}
                    </span>
                    {organizer.avgRating > 0 && (
                      <span className="text-xs text-gray-500">rating</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold text-brand-600">
                  {organizer.totalTickets.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Total Sales</div>
                {organizer.eventsCount > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    {(organizer.totalTickets / organizer.eventsCount).toFixed(0)} avg/event
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {organizers.reduce((sum, o) => sum + o.totalTickets, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Tickets Sold</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {organizers.reduce((sum, o) => sum + o.eventsCount, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total Events</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {(
              organizers.reduce((sum, o) => sum + o.avgRating, 0) / 
              organizers.filter(o => o.avgRating > 0).length
            ).toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Avg Rating</div>
        </div>
      </div>
    </div>
  )
}
