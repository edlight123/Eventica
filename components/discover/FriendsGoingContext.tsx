'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Provides "friends going" counts for the events currently on screen.
 *
 * One batched request resolves counts for every visible event, so individual
 * cards can render a social-proof badge without each making its own call. Only
 * fetches for signed-in users (anonymous visitors have no friend graph).
 *
 * DELIBERATELY NO STATIC FIREBASE IMPORT HERE. `firebase/auth` and
 * `@/lib/firebase/client` are loaded with `await import(...)` inside the effect
 * below. This file is a shared leaf: DiscoverEventCard imports it, and nine
 * files import DiscoverEventCard (HomePageContent, ui/EditorialRails,
 * favorites, categories, event details, organizer profile, ...). A static
 * `from 'firebase/auth'` at module scope therefore drags the whole Firebase SDK
 * onto the first load of nearly every page: measured at 444KB across three
 * chunks (223 + 136 + 85KB) out of ~988KB of shared JS. Dropping the last
 * static importer from a route roughly halves that — /resources went 350KB ->
 * 167KB once its only importer was deferred. If you "clean this up" back into a
 * top-level import, you put all 444KB back on the homepage.
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
  // Starts false, i.e. "no counts yet". onAuthStateChanged never fires
  // synchronously, so this was already the state on the first paint before the
  // import was deferred; the deferral only makes that window a little longer.
  // No consumer can tell: an absent count renders as 0 and the badge hides.
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | undefined

    void (async () => {
      try {
        const [{ onAuthStateChanged }, { auth }] = await Promise.all([
          import('firebase/auth'),
          import('@/lib/firebase/client'),
        ])
        // Teardown may already have run while the chunks were in flight (fast
        // unmount, or the StrictMode double-invoke in dev). Bail before
        // subscribing rather than leaking a listener per mount. There is no
        // await between this guard and the assignment below, so cleanup cannot
        // interleave — keep it that way if you edit this.
        if (cancelled) return
        unsub = onAuthStateChanged(auth, (user) => {
          if (cancelled) return
          setIsAuthed(Boolean(user))
        })
      } catch {
        /* badge is best-effort; a failed chunk load just means no counts */
      }
    })()

    return () => {
      cancelled = true
      unsub?.()
      unsub = undefined
    }
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
