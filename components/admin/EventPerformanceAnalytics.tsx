'use client'

import { useEffect, useState } from 'react'
import { Trophy, TrendingUp } from 'lucide-react'
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
    <div className="space-y-4">
      {/* Top Performing Events */}
      <div className="rounded-lg border border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-300" />
          <h3 className="text-[13px] font-semibold text-white">Top performing events</h3>
        </div>
        {topEvents.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {topEvents.map((event, index) => (
              <li key={event.id} className="flex items-center gap-3 py-2.5">
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-white/40">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/events/${event.id}`}
                    className="block truncate text-sm font-medium text-white transition-colors hover:text-brand-300"
                  >
                    {event.title}
                  </Link>
                  <div className="mt-0.5 truncate text-xs text-white/40">
                    {new Date(event.date).toLocaleDateString()} · {event.users?.name || 'Unknown'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, event.successScore)}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-bold tabular-nums text-brand-300">{event.successScore}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8 text-center text-sm text-white/40">No event data available</div>
        )}
      </div>

      {/* Category Popularity */}
      <div className="rounded-lg border border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-300" />
          <h3 className="text-[13px] font-semibold text-white">Popular categories · 30d</h3>
        </div>
        {categories.length > 0 ? (
          <div className="space-y-2.5">
            {categories.map((category) => {
              const percentage = totalTicketsSold > 0 ? (category.count / totalTicketsSold) * 100 : 0
              return (
                <div key={category.category} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-sm text-white">{category.category}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-white/50">{category.count} · {percentage.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-white/40">No category data available</div>
        )}
      </div>
    </div>
  )
}
