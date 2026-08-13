import { createHash } from 'node:crypto'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Password-protected events gate.
 *
 * When an event has `is_password_protected: true`, a buyer may only purchase /
 * claim tickets after proving they know the secret code. The proof is the
 * existence of `events/{eventId}/access_grants/{subjectId}`, which is written
 * ONLY server-side (Admin) after a correct code.
 *
 * `subjectId` is a Firebase uid for an account holder and a `guest_…` id for a
 * guest checkout. That is the ONE thing that changed when guests were allowed in:
 * the grant is keyed by whoever is buying, exactly as `tickets.attendee_id` is,
 * rather than by a uid specifically. Everything else about the gate is unchanged
 * — the code is still compared as a SHA-256 hash against `private/access`, a
 * wrong code still fails, and the plaintext is never stored or logged.
 *
 * These MUST be called with the Admin SDK (privileged reads/writes) because
 * Firestore rules deny client reads of another buyer's grant and of the code.
 */

/** Brute-force throttle: block after this many failed attempts within the window. */
export const MAX_FAILED_ACCESS_ATTEMPTS = 10
export const ACCESS_ATTEMPT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * Hash an access code. Identical to the hashing the verify-access endpoint has
 * always used, so codes stored before guests existed keep working.
 */
function hashCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex')
}

/**
 * The doc id a throttle counter lives under.
 *
 * A signed-in buyer is throttled per account (unchanged). A guest has no account,
 * so they are throttled per IP — hashed, both to keep a raw IP out of Firestore
 * and to produce a safe document id that can never collide with a uid or a
 * `guest_…` id.
 */
export function accessAttemptKey(params: {
  subjectId?: string | null
  ipAddress?: string | null
}): string | null {
  const subject = String(params.subjectId || '').trim()
  if (subject && !subject.startsWith('guest_')) return subject

  const ip = String(params.ipAddress || '').trim()
  if (!ip || ip === 'unknown') return null
  return `ip_${createHash('sha256').update(ip).digest('hex').slice(0, 40)}`
}

/** True when this attempter has burned through the window's allowance. */
export async function isAccessThrottled(eventId: string, attemptKey: string | null): Promise<boolean> {
  if (!eventId || !attemptKey) return false
  const snap = await adminDb
    .collection('events')
    .doc(eventId)
    .collection('access_attempts')
    .doc(attemptKey)
    .get()
  if (!snap.exists) return false

  const data = snap.data() || {}
  const windowStart = Number(data.window_start || 0)
  const count = Number(data.count || 0)
  return Boolean(
    windowStart &&
      Date.now() - windowStart < ACCESS_ATTEMPT_WINDOW_MS &&
      count >= MAX_FAILED_ACCESS_ATTEMPTS
  )
}

/** Record a failed attempt, rolling the window over when it has expired. */
export async function recordFailedAccessAttempt(
  eventId: string,
  attemptKey: string | null
): Promise<void> {
  if (!eventId || !attemptKey) return
  const ref = adminDb
    .collection('events')
    .doc(eventId)
    .collection('access_attempts')
    .doc(attemptKey)

  const now = Date.now()
  const snap = await ref.get()
  const prev = snap.exists ? snap.data() || {} : {}
  const prevWindowStart = Number(prev.window_start || 0)
  const withinWindow = Boolean(prevWindowStart && now - prevWindowStart < ACCESS_ATTEMPT_WINDOW_MS)

  await ref.set(
    {
      count: withinWindow ? Number(prev.count || 0) + 1 : 1,
      window_start: withinWindow ? prevWindowStart : now,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

/** Clear the throttle counter after a correct code. */
export async function clearAccessAttempts(
  eventId: string,
  attemptKey: string | null
): Promise<void> {
  if (!eventId || !attemptKey) return
  await adminDb
    .collection('events')
    .doc(eventId)
    .collection('access_attempts')
    .doc(attemptKey)
    .delete()
    .catch(() => {})
}

/**
 * Compare a supplied code against the event's stored hash.
 *
 * Returns false when no code is stored, so an event flagged protected without a
 * code can never be unlocked by guessing. The plaintext is hashed immediately and
 * is never written anywhere or logged.
 */
export async function accessCodeMatches(eventId: string, code: unknown): Promise<boolean> {
  const raw = String(code ?? '')
  if (!eventId || !raw.trim()) return false

  const snap = await adminDb
    .collection('events')
    .doc(eventId)
    .collection('private')
    .doc('access')
    .get()
  const storedHash = snap.exists ? String(snap.data()?.code_hash || '') : ''
  if (!storedHash) return false

  return storedHash === hashCode(raw)
}

/** Whether a buyer already holds a grant for this event. */
export async function hasAccessGrant(eventId: string, subjectId: string): Promise<boolean> {
  if (!eventId || !subjectId) return false
  const snap = await adminDb
    .collection('events')
    .doc(eventId)
    .collection('access_grants')
    .doc(subjectId)
    .get()
  return snap.exists
}

/**
 * Record that this buyer proved they know the code.
 *
 * `subjectId` is a uid or a `guest_…` id. Only the fact of the grant is stored —
 * never the code itself.
 */
export async function grantEventAccess(
  eventId: string,
  subjectId: string,
  meta?: { isGuest?: boolean }
): Promise<void> {
  if (!eventId || !subjectId) return
  await adminDb
    .collection('events')
    .doc(eventId)
    .collection('access_grants')
    .doc(subjectId)
    .set(
      {
        granted_at: FieldValue.serverTimestamp(),
        ...(meta?.isGuest ? { is_guest: true } : {}),
      },
      { merge: true }
    )
}

/**
 * @returns true when the purchase/issuance is allowed to proceed.
 *
 * Unchanged behaviour: an unprotected event always passes, and a protected one
 * passes only on an existing grant.
 */
export async function hasEventAccess(
  event: { is_password_protected?: boolean } | null | undefined,
  eventId: string,
  uid: string
): Promise<boolean> {
  if (!event?.is_password_protected) return true
  if (!eventId || !uid) return false
  return hasAccessGrant(eventId, uid)
}

export type AccessCheck =
  | { ok: true }
  | { ok: false; code: 'access_code_required' | 'access_code_incorrect' | 'access_throttled' }

/**
 * The gate for a buyer who may be presenting the code right now.
 *
 * Order matters: an existing grant short-circuits (so a signed-in buyer who
 * unlocked the event earlier is unaffected and spends no extra reads), then a
 * supplied code is throttled, hashed, compared, and — only on a match — turned
 * into a grant for this buyer. A wrong code is recorded against the throttle and
 * refused; it never becomes a grant.
 */
export async function ensureEventAccess(params: {
  event: { is_password_protected?: boolean } | null | undefined
  eventId: string
  /** uid, or the `guest_…` id minted for this checkout. */
  subjectId: string
  /** The code the buyer typed, when this request carries one. */
  accessCode?: unknown
  isGuest?: boolean
  ipAddress?: string | null
}): Promise<AccessCheck> {
  if (!params.event?.is_password_protected) return { ok: true }
  if (!params.eventId || !params.subjectId) return { ok: false, code: 'access_code_required' }

  if (await hasAccessGrant(params.eventId, params.subjectId)) return { ok: true }

  const supplied = String(params.accessCode ?? '').trim()
  if (!supplied) return { ok: false, code: 'access_code_required' }

  const attemptKey = accessAttemptKey({
    subjectId: params.isGuest ? null : params.subjectId,
    ipAddress: params.ipAddress,
  })
  if (await isAccessThrottled(params.eventId, attemptKey)) {
    return { ok: false, code: 'access_throttled' }
  }

  if (!(await accessCodeMatches(params.eventId, supplied))) {
    await recordFailedAccessAttempt(params.eventId, attemptKey)
    return { ok: false, code: 'access_code_incorrect' }
  }

  await grantEventAccess(params.eventId, params.subjectId, { isGuest: params.isGuest })
  await clearAccessAttempts(params.eventId, attemptKey)
  return { ok: true }
}
