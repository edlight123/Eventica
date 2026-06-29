'use client'

import { useEffect, useState } from 'react'
import { Crown, Star, Ticket, Calendar } from 'lucide-react'
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
      <div className="text-center py-12 text-white/50">
        No organizer data available
      </div>
    )
  }

  const ratedCount = organizers.filter((o) => o.avgRating > 0).length
  const avgRating = ratedCount > 0 ? organizers.reduce((sum, o) => sum + o.avgRating, 0) / ratedCount : 0

  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-300" />
        <h3 className="text-[13px] font-semibold text-white">Top organizers</h3>
        <span className="text-xs text-white/50">· by ticket sales</span>
      </div>

      <ul className="divide-y divide-white/5">
        {organizers.map((organizer, index) => {
          const rank = index + 1
          const isTopThree = rank <= 3
          return (
            <li key={organizer.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`w-5 shrink-0 text-center text-sm font-bold tabular-nums ${
                  isTopThree ? 'text-amber-300' : 'text-white/50'
                }`}
              >
                {rank}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/organizer/profile/${organizer.id}`}
                  className="block truncate text-sm font-semibold text-white transition-colors hover:text-brand-300"
                >
                  {organizer.name}
                </Link>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-white/50">
                  <span className="inline-flex items-center gap-1"><Ticket className="h-3 w-3" />{organizer.totalTickets.toLocaleString()}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{organizer.eventsCount}</span>
                  {organizer.avgRating > 0 && (
                    <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-amber-300" />{organizer.avgRating.toFixed(1)}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold tabular-nums text-white">{organizer.totalTickets.toLocaleString()}</div>
                <div className="text-[11px] text-white/50">
                  {organizer.eventsCount > 0 ? `${(organizer.totalTickets / organizer.eventsCount).toFixed(0)}/event` : 'sales'}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Summary */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3">
        {[
          { v: organizers.reduce((s, o) => s + o.totalTickets, 0).toLocaleString(), l: 'Tickets sold' },
          { v: organizers.reduce((s, o) => s + o.eventsCount, 0).toLocaleString(), l: 'Events' },
          { v: avgRating > 0 ? avgRating.toFixed(1) : 'N/A', l: 'Avg rating' },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <div className="text-lg font-bold tabular-nums text-white">{s.v}</div>
            <div className="mt-0.5 text-[11px] text-white/50">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
