'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

/**
 * Provides "friends going" counts for the events currently on screen.
 *
 * One batched request resolves counts for every visible event, so individual
 * cards can render a social-proof badge without each making its own call. Only
 * fetches for signed-in users (anonymous visitors have no friend graph).
 */
const FriendsGoingContext = createContext<Record<string, number>>({})

export function useFriendsGoingCount(eventId: string): number {
  const counts = useContext(FriendsGoingContext)
  return counts[eventId] || 0
}

export function FriendsGoingProvider({
  eventIds,
  children,
}: {
  eventIds: string[]
  children: React.ReactNode
}) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setIsAuthed(Boolean(user)))
    return () => unsub()
  }, [])

  // Stable key so we only refetch when the set of events actually changes.
  const idsKey = useMemo(
    () => Array.from(new Set(eventIds.filter(Boolean))).sort().join(','),
    [eventIds]
  )

  useEffect(() => {
    if (!isAuthed || !idsKey) {
      setCounts({})
      return
    }
    let active = true
    const ids = idsKey.split(',')
    ;(async () => {
      try {
        const res = await fetch('/api/events/social-counts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventIds: ids }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (active) setCounts(data?.counts || {})
      } catch {
        /* badge is best-effort; ignore failures */
      }
    })()
    return () => {
      active = false
    }
  }, [isAuthed, idsKey])

  return <FriendsGoingContext.Provider value={counts}>{children}</FriendsGoingContext.Provider>
}
