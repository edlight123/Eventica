import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { sendDiscretionary } from '@/lib/notifications/campaigns'
import { sameCity } from '@/lib/notifications/audience-city'

export const dynamic = 'force-dynamic'

/**
 * "New events in your city" — the one discovery push.
 *
 * Weekly on purpose. Discovery is the category people mute first, and muting is
 * permanent in practice, so it gets one considered message a week rather than a
 * trickle. Quiet hours and the per-user cap are enforced by `sendDiscretionary`.
 *
 * The user's city comes from the IP Vercel already resolves (see
 * lib/notifications/audience-city). No location permission is involved, and the
 * match is city-level only — carrier gateways make anything finer dishonest.
 */

/** How far ahead an event may start and still count as news. */
const HORIZON_DAYS = 14

/** Most events named in one message. Beyond this it reads as a listing, not news. */
const MAX_EVENTS_NAMED = 3

/**
 * Hard ceilings so one run cannot scan an unbounded collection.
 *
 * At the current audience these are never reached. They exist because a weekly
 * job that reads every user and every published event is fine at 22 users and a
 * silent 300s function timeout at 22,000 — and the failure mode is that the
 * users late in the scan simply never hear from us, with a green cron run.
 * BEFORE the audience outgrows these, this needs a cursor and multiple passes.
 */
const MAX_EVENTS_SCANNED = 2000
const MAX_USERS_PER_RUN = 5000

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000)
  // Week key, so the cap naturally expires each week instead of needing a sweep.
  const weekKey = `${now.getUTCFullYear()}w${Math.floor(
    (now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000)
  )}`

  try {
    // Upcoming published events. Read once and group in memory: the alternative
    // is a query per user, and the event set is far smaller than the audience.
    const eventsSnap = await adminDb
      .collection('events')
      .where('is_published', '==', true)
      .limit(MAX_EVENTS_SCANNED)
      .get()

    const upcoming = eventsSnap.docs
      .map((d: any) => ({ id: d.id, ...(d.data() || {}) }))
      .filter((e: any) => {
        // start_datetime is an ISO string for some events and a Timestamp for
        // others, so normalize rather than comparing raw values.
        const raw = e?.start_datetime
        const start = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null
        return start instanceof Date && !isNaN(start.getTime()) && start > now && start <= horizon
      })

    if (upcoming.length === 0) {
      return NextResponse.json({ ok: true, notified: 0, reason: 'no upcoming events' })
    }

    // Only users who can actually receive a push and whose city we know.
    const usersSnap = await adminDb
      .collection('users')
      .where('last_seen_city', '!=', null)
      .limit(MAX_USERS_PER_RUN)
      .get()

    let notified = 0
    for (const doc of usersSnap.docs) {
      const user = doc.data() || {}
      const city = String(user.last_seen_city || '')
      if (!city) continue

      const inCity = upcoming.filter((e: any) => sameCity(city, String(e.city || '')))
      if (inCity.length === 0) continue

      const named = inCity.slice(0, MAX_EVENTS_NAMED)
      const title =
        inCity.length === 1
          ? `New in ${city}: ${named[0].title}`
          : `${inCity.length} new events in ${city}`
      const body = named.map((e: any) => e.title).join(' · ')

      const sent = await sendDiscretionary({
        userId: doc.id,
        category: 'discovery',
        capKey: `discovery:${weekKey}`,
        type: 'city_discovery',
        title,
        body,
        url: '/discover',
        data: { city, eventCount: inCity.length },
      })
      if (sent) notified++
    }

    // Report the ceiling being hit, so a truncated run is visible rather than
    // looking like a quiet week.
    const truncated =
      usersSnap.size >= MAX_USERS_PER_RUN || eventsSnap.size >= MAX_EVENTS_SCANNED
    return NextResponse.json({
      ok: true,
      notified,
      candidates: upcoming.length,
      ...(truncated ? { truncated: true } : {}),
    })
  } catch (error: any) {
    console.error('[city-discovery] failed', error)
    return NextResponse.json({ error: error?.message || 'failed' }, { status: 500 })
  }
}
