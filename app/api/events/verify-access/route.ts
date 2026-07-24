import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

// Brute-force throttle: block after this many failed attempts within the window.
const MAX_FAILED_ATTEMPTS = 10
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function hashCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex')
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

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

    // Throttle check (per-user, per-event).
    const attemptsRef = eventRef.collection('access_attempts').doc(user.id)
    const now = Date.now()
    const attemptsSnap = await attemptsRef.get()
    if (attemptsSnap.exists) {
      const data = attemptsSnap.data() || {}
      const windowStart = Number(data.window_start || 0)
      const count = Number(data.count || 0)
      if (windowStart && now - windowStart < ATTEMPT_WINDOW_MS && count >= MAX_FAILED_ATTEMPTS) {
        return NextResponse.json(
          { ok: false, error: 'Too many attempts. Please try again later.' },
          { status: 429 }
        )
      }
    }

    // Read the hashed code from the private subcollection (Admin only).
    const accessSnap = await eventRef.collection('private').doc('access').get()
    const storedHash = accessSnap.exists ? String(accessSnap.data()?.code_hash || '') : ''

    const providedHash = hashCode(code)
    const isMatch = Boolean(storedHash) && storedHash === providedHash

    if (!isMatch) {
      // Record the failed attempt, resetting the window if it has expired.
      const prev = attemptsSnap.exists ? attemptsSnap.data() || {} : {}
      const prevWindowStart = Number(prev.window_start || 0)
      const withinWindow = prevWindowStart && now - prevWindowStart < ATTEMPT_WINDOW_MS
      await attemptsRef.set(
        {
          count: withinWindow ? Number(prev.count || 0) + 1 : 1,
          window_start: withinWindow ? prevWindowStart : now,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      return NextResponse.json({ ok: false, error: 'Incorrect access code' }, { status: 403 })
    }

    // Correct code: grant access and clear the attempt counter.
    await eventRef
      .collection('access_grants')
      .doc(user.id)
      .set({ granted_at: FieldValue.serverTimestamp() }, { merge: true })

    if (attemptsSnap.exists) {
      await attemptsRef.delete().catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('verify-access error:', error?.message)
    return NextResponse.json(
      { ok: false, error: 'Failed to verify access code' },
      { status: 500 }
    )
  }
}
