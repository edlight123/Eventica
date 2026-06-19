import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getFriendsGoingCounts } from '@/lib/firestore/social'

export const runtime = 'nodejs'

const MAX_EVENTS = 100

/**
 * Batch "friends going" counts for a set of events, from the viewer's
 * perspective. Powers the social-proof badge on event cards. Anonymous viewers
 * (no friend graph) get an empty map. Privacy is enforced server-side: a friend
 * only counts if their attendance visibility allows it.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser().catch(() => null)
    if (!user) {
      return NextResponse.json({ counts: {} })
    }

    const body = await request.json().catch(() => null)
    const rawIds = Array.isArray(body?.eventIds) ? body.eventIds : []
    const eventIds = rawIds
      .filter((id: any) => typeof id === 'string' && id.length > 0)
      .slice(0, MAX_EVENTS)

    if (eventIds.length === 0) {
      return NextResponse.json({ counts: {} })
    }

    const counts = await getFriendsGoingCounts(user.id, eventIds)
    return NextResponse.json({ counts })
  } catch (error: any) {
    console.error('Error computing friends-going counts:', error)
    // Badge is best-effort — never break the feed.
    return NextResponse.json({ counts: {} }, { status: 200 })
  }
}
