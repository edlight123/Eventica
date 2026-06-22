'use client'

import { useEffect, useState } from 'react'
import { Trophy, Ticket, Heart, Star, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface EventData {
  id: string
  title: string
  date: string
  ticket_price: number
  capacity: number
  organizer_id: string
  successScore: number
  users?: { name: string }
}

interface CategoryData {
  category: string
  count: number
}

export function EventPerformanceAnalytics() {
  const [topEvents, setTopEvents] = useState<EventData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/analytics-data?type=top-events&limit=10').then(r => r.json()),
      fetch('/api/admin/analytics-data?type=categories&days=30').then(r => r.json())
    ]).then(([eventsRes, catsRes]) => {
      const events = eventsRes.data || eventsRes
      const cats = catsRes.data || catsRes
      setTopEvents(Array.isArray(events) ? events : [])
      setCategories(Array.isArray(cats) ? cats : [])
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load event data:', err)
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

  const totalTicketsSold = categories.reduce((sum, cat) => sum + cat.count, 0)

  return (
    <div className="space-y-6">
      {/* Top Performing Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Events</h3>
        </div>
        {topEvents.length > 0 ? (
          <div className="space-y-3">
            {topEvents.map((event, index) => (
              <div
                key={event.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-brand-300 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center text-white font-bold">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/events/${event.id}`}
                    className="font-medium text-gray-900 hover:text-brand-600 transition-colors block truncate"
                  >
                    {event.title}
                  </Link>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(event.date).toLocaleDateString()} • By {event.users?.name || 'Unknown'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Success Score</div>
                    <div className="text-lg font-bold text-brand-600">{event.successScore}/100</div>
                  </div>
                  <div className="w-16 h-16">
                    <svg className="transform -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#14b8a6"
                        strokeWidth="3"
                        strokeDasharray={`${event.successScore}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No event data available</div>
        )}
      </div>

      {/* Category Popularity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6 text-brand-500" />
          <h3 className="text-lg font-semibold text-gray-900">Popular Categories (Last 30 Days)</h3>
        </div>
        {categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map((category, index) => {
              const percentage = totalTicketsSold > 0 ? (category.count / totalTicketsSold) * 100 : 0
              const colors = [
                'bg-brand-700',
                'bg-brand-500',
                'bg-brand-300',
                'bg-brand-200',
                'bg-slate-400'
              ]
              const color = colors[index % colors.length]

              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{category.category}</span>
                    <span className="text-sm text-gray-600">
                      {category.count} tickets ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`${color} h-2.5 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No category data available</div>
        )}
      </div>
    </div>
  )
}
