'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Lock } from 'lucide-react'
import type { PublicUserSummary } from '@/types/social'

interface WhosGoingProps {
  eventId: string
  currentUserId: string | null
}

interface SocialData {
  totalGoing: number
  viewerIsGoing: boolean
  friendsGoing: PublicUserSummary[]
  publicGoing: PublicUserSummary[]
}

function Avatar({ user, size = 40 }: { user: PublicUserSummary; size?: number }) {
  const initial = (user.displayName || 'U').charAt(0).toUpperCase()
  return (
    <div
      className="rounded-full overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold ring-2 ring-[#0a0a0a]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={user.displayName}
    >
      {user.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  )
}

export default function WhosGoing({ eventId, currentUserId }: WhosGoingProps) {
  const [data, setData] = useState<SocialData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/events/${eventId}/social`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json) setData(json)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [eventId])

  if (loading) {
    return (
      <div className="bg-white/5 rounded-2xl border border-white/10 p-4 md:p-6">
        <div className="h-5 w-32 bg-white/10 rounded mb-4 animate-pulse" />
        <div className="flex -space-x-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-10 h-10 rounded-full bg-white/10 ring-2 ring-[#0a0a0a] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.totalGoing === 0) {
    return null
  }

  const { totalGoing, viewerIsGoing, friendsGoing, publicGoing } = data
  const pile = publicGoing.slice(0, 8)
  const namedCount = friendsGoing.length + pile.length
  const remaining = Math.max(0, totalGoing - namedCount - (viewerIsGoing ? 1 : 0))

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-400" />
          Who&apos;s going
        </h2>
        <span className="text-sm font-semibold text-white/50">
          {totalGoing} {totalGoing === 1 ? 'person' : 'people'}
        </span>
      </div>

      {/* Friends going */}
      {friendsGoing.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-brand-300 uppercase tracking-wide mb-2">
            {friendsGoing.length} {friendsGoing.length === 1 ? 'friend' : 'friends'} going
          </p>
          <div className="flex flex-wrap gap-3">
            {friendsGoing.map((f) => (
              <Link
                key={f.uid}
                href={`/profile/organizer/${f.uid}`}
                className="flex items-center gap-2 hover:bg-brand-500/25 rounded-full pl-1 pr-3 py-1 transition-colors"
              >
                <Avatar user={f} size={28} />
                <span className="text-sm font-medium text-white truncate max-w-[120px]">{f.displayName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Public face pile */}
      {(pile.length > 0 || viewerIsGoing) && (
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            {viewerIsGoing && (
              <div
                className="rounded-full w-10 h-10 bg-brand-600 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-[#0a0a0a]"
                title="You're going"
              >
                You
              </div>
            )}
            {pile.map((u) => (
              <Avatar key={u.uid} user={u} size={40} />
            ))}
            {remaining > 0 && (
              <div className="rounded-full w-10 h-10 bg-white/10 flex items-center justify-center text-white/70 text-xs font-semibold ring-2 ring-[#0a0a0a]">
                +{remaining}
              </div>
            )}
          </div>
          <p className="text-sm text-white/55">
            {viewerIsGoing ? "You're going" : `${totalGoing} going`}
          </p>
        </div>
      )}

      {/* Privacy note when nobody is publicly visible */}
      {friendsGoing.length === 0 && pile.length === 0 && (
        <div className="flex items-start gap-2 text-sm text-white/50">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            {totalGoing} {totalGoing === 1 ? 'person is' : 'people are'} going. Attendees keep their
            attendance private.{' '}
            {currentUserId && (
              <Link href="/profile" className="text-brand-300 hover:underline font-medium">
                Show that you&apos;re going
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
