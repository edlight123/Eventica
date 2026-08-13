import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import {
  accessAttemptKey,
  accessCodeMatches,
  clearAccessAttempts,
  grantEventAccess,
  isAccessThrottled,
  recordFailedAccessAttempt,
} from '@/lib/events/access-guard'

export const runtime = 'nodejs'

/**
 * Check an event's access code.
 *
 * SIGNED IN — unchanged: a correct code writes `access_grants/{uid}` and every
 * later purchase/claim passes on the strength of that grant alone.
 *
 * GUEST (no session) — the code is verified and the answer returned, but NO grant
 * is minted, because there is no id yet to mint it against: a guest's `guest_…`
 * id is created when their order is. The client keeps the code and presents it
 * with the checkout request, where it is verified again server-side before the
 * order exists (see lib/guest/checkout.ts). So this endpoint never becomes a way
 * to obtain access — it only tells the buyer whether the code they typed is right,
 * under the same throttle, so they find out before filling in a checkout form.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    const body = await request.json().catch(() => ({}))
    const eventId = typeof body?.eventId === 'string' ? body.eventId : ''
    const code = typeof body?.code === 'string' ? body.code : ''

    if (!eventId) {
      return NextResponse.json({ ok: false, error: 'Event ID is required' }, { status: 400 })
    }
    if (!code || !code.trim()) {
      return NextResponse.json({ ok: false, error: 'Access code is required' }, { status: 400 })
    }

    const eventRef = adminDb.collection('events').doc(eventId)

    // Only mint grants for events that are CURRENTLY password-protected. A stale
    // private/access hash left over from toggling protection off must not be
    // usable to obtain a grant.
    const eventSnap = await eventRef.get()
    if (!eventSnap.exists) {
      return NextResponse.json({ ok: false, error: 'Event not found' }, { status: 404 })
    }
    if (!eventSnap.data()?.is_password_protected) {
      return NextResponse.json({ ok: true })
    }

    // Throttle: per-account for a signed-in buyer (unchanged), per-IP for a guest,
    // who has no account to count against.
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const attemptKey = accessAttemptKey({
      subjectId: user ? user.id : null,
      ipAddress,
    })

    if (await isAccessThrottled(eventId, attemptKey)) {
      return NextResponse.json(
        { ok: false, error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    if (!(await accessCodeMatches(eventId, code))) {
      await recordFailedAccessAttempt(eventId, attemptKey)
      return NextResponse.json({ ok: false, error: 'Incorrect access code' }, { status: 403 })
    }

    // Correct code. A session gets a durable grant; a guest gets only the answer,
    // and re-proves the code at checkout.
    if (user) {
      await grantEventAccess(eventId, user.id)
    }
    await clearAccessAttempts(eventId, attemptKey)

    return NextResponse.json({ ok: true, granted: Boolean(user) })
  } catch (error: any) {
    console.error('verify-access error:', error?.message)
    return NextResponse.json(
      { ok: false, error: 'Failed to verify access code' },
      { status: 500 }
    )
  }
}
