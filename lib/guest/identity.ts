// Guest identity: buying a ticket without an account.
//
// WHY THIS EXISTS
// Most Tikèm traffic arrives from an Instagram link, inside Instagram's embedded
// WebView. Google sign-in (`signInWithPopup`) is refused inside embedded WebViews,
// so "sign in to get tickets" is a dead end for the majority of buyers. A guest can
// therefore check out with a name, an email, and — for Haiti — a phone number.
//
// THE IDENTITY MODEL
//   • A guest is NOT a Firebase user and has no uid. Their identifier is a
//     server-minted `guest_<random>` id which is written to the ticket's
//     `attendee_id`, so every downstream consumer that reads a ticket (the scanner,
//     earnings, exports) keeps working unchanged.
//   • The buyer's CONTACT DETAILS live on the order (pending transaction / payment
//     metadata) and are copied onto the issued tickets (`guest_email`,`guest_phone`).
//     Refund + support lookups by email or phone therefore work off the order and the
//     ticket, never off a session.
//   • Retrieval is by an OPAQUE, SIGNED TOKEN, never by the guest id or the ticket id.
//     The token is `{orderKey}.{HMAC-SHA256(orderKey)}` where `orderKey` is 192 bits of
//     randomness AND the Firestore document id of the guest order. Two independent
//     barriers: you cannot guess the key, and even if a key leaked (a log line, an
//     export) you still cannot mint the signature without the server secret. Knowing a
//     guest id, an email, a phone number, or a ticket id gets you nothing.
//   • The token is DERIVABLE from the order key rather than stored, so any fulfillment
//     path (a gateway return, a webhook hours later) can rebuild the buyer's own link
//     without the system ever persisting a bearer credential.
//
// Nothing here is authenticated-path behavior: when a real session exists the
// existing code path runs untouched.

import crypto from 'crypto'
import { adminDb } from '@/lib/firebase/admin'

/** Prefix that marks an `attendee_id` / `user_id` as a guest rather than a Firebase uid. */
export const GUEST_ID_PREFIX = 'guest_'

/** True when an attendee/user identifier belongs to a guest checkout, not an account. */
export function isGuestId(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith(GUEST_ID_PREFIX)
}

export interface GuestContact {
  name: string
  email: string
  /** E.164-ish, or '' when the buyer gave none (only required for Haiti events). */
  phone: string
}

export interface GuestOrderRecord {
  /**
   * The guest order's Firestore document id: 192 random bits, and the payload half
   * of the retrieval token. Persisted on the order so fulfillment can find this
   * record and re-derive the buyer's link.
   */
  orderKey: string
  guestId: string
  name: string
  email: string
  phone: string
  eventId: string
  status: 'pending' | 'issued'
  ticketIds: string[]
  claimedByUid: string | null
  createdAt: string
}

// ── Normalization ────────────────────────────────────────────────────────────

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= 254
}

/**
 * Normalize a phone number to E.164 where we can.
 *
 * Haiti is the default country because that is where phone-first buyers are: a
 * locally-typed 8-digit MonCash number ("3412 3456") becomes "+50934123456".
 * Anything already carrying a country code is respected as typed.
 */
export function normalizePhone(raw: unknown, defaultCountry: string = 'HT'): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''

  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  if (hasPlus) return `+${digits}`

  if (defaultCountry === 'HT') {
    // 8 local digits → +509XXXXXXXX; 11 digits already starting with 509 → +509…
    if (digits.length === 8) return `+509${digits}`
    if (digits.length === 11 && digits.startsWith('509')) return `+${digits}`
  }
  if (defaultCountry === 'US' || defaultCountry === 'CA') {
    if (digits.length === 10) return `+1${digits}`
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  }

  // Unknown shape: keep the digits with a '+' so downstream (Twilio) either works
  // or fails loudly, rather than silently texting a malformed number.
  return `+${digits}`
}

/** A normalized phone we are willing to send an SMS to. */
export function isValidPhone(value: string): boolean {
  return /^\+\d{8,15}$/.test(value)
}

export type GuestContactResult =
  | { ok: true; contact: GuestContact }
  | { ok: false; error: string; code: string }

/**
 * Validate the contact details a guest typed at checkout.
 *
 * `requirePhone` is set for Haiti events: a phone number is more universal there
 * than an email address, so it is a first-class identifier rather than an optional
 * extra — the ticket is delivered by SMS as well as by email.
 */
export function validateGuestContact(
  raw: unknown,
  opts: { requirePhone?: boolean; defaultCountry?: string } = {}
): GuestContactResult {
  const input = (raw ?? {}) as Record<string, unknown>
  const name = String(input.name ?? '').trim().slice(0, 120)
  const email = normalizeEmail(input.email)
  const phone = normalizePhone(input.phone, opts.defaultCountry || 'HT')

  if (!name) {
    return { ok: false, error: 'Please enter your name.', code: 'guest_name_required' }
  }
  if (!email || !isValidEmail(email)) {
    return { ok: false, error: 'Please enter a valid email address.', code: 'guest_email_invalid' }
  }
  if (opts.requirePhone && !phone) {
    return { ok: false, error: 'Please enter your phone number.', code: 'guest_phone_required' }
  }
  if (phone && !isValidPhone(phone)) {
    return { ok: false, error: 'Please enter a valid phone number.', code: 'guest_phone_invalid' }
  }

  return { ok: true, contact: { name, email, phone } }
}

// ── Token + record ───────────────────────────────────────────────────────────

/**
 * HMAC key for retrieval links.
 *
 * Prefers a dedicated `GUEST_TICKET_LINK_SECRET`, then the wallet link secret, then
 * a key derived from the Firebase service-account credential — which must already
 * exist for any of this app to run, so a guest can always be handed a working link
 * rather than the deploy silently losing its ticket delivery. The order key carries
 * 192 bits of entropy on its own, so even the derived case is not guessable; the
 * signature is the second barrier.
 */
function linkSecret(): Buffer {
  const explicit =
    process.env.GUEST_TICKET_LINK_SECRET?.trim() || process.env.WALLET_PASS_LINK_SECRET?.trim()
  if (explicit) return Buffer.from(explicit, 'utf8')

  const derivedFrom = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  return crypto
    .createHash('sha256')
    .update(`tikem-guest-ticket-link|${derivedFrom || 'unconfigured'}`)
    .digest()
}

function signOrderKey(orderKey: string): string {
  return crypto
    .createHmac('sha256', linkSecret())
    .update(orderKey)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    // 128 bits of tag is ample for a link nobody gets to brute-force online.
    .slice(0, 22)
}

/** A fresh, unguessable guest-order key. */
export function mintGuestOrderKey(): string {
  return crypto.randomBytes(24).toString('hex')
}

/** Build the retrieval token for an order key. Deterministic — safe to re-derive later. */
export function guestTokenFor(orderKey: string): string {
  return `${orderKey}.${signOrderKey(orderKey)}`
}

/**
 * Verify a retrieval token and return the order key it names.
 * Constant-time signature comparison; a forged token is indistinguishable from a
 * malformed one to the caller.
 */
export function verifyGuestToken(token: unknown): string | null {
  const raw = String(token ?? '').trim()
  if (!raw || raw.length > 200) return null

  const parts = raw.split('.')
  if (parts.length !== 2) return null
  const [orderKey, providedSignature] = parts
  if (!/^[a-f0-9]{48}$/.test(orderKey) || !providedSignature) return null

  const expected = Buffer.from(signOrderKey(orderKey), 'utf8')
  const provided = Buffer.from(providedSignature, 'utf8')
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null
  }
  return orderKey
}

function newGuestId(): string {
  return `${GUEST_ID_PREFIX}${crypto.randomBytes(12).toString('hex')}`
}

/**
 * Create the guest order record for a checkout that is ABOUT to happen.
 *
 * Called at initiate/claim time so the order carries the buyer's contact details
 * from the very first write. Fulfillment later resolves the recipient FROM THIS
 * RECORD (or from the pending transaction that mirrors it) and never from a request
 * body, so a confirmation can't be redirected to an attacker-supplied address.
 */
export async function createGuestOrder(params: {
  contact: GuestContact
  eventId: string
  ipAddress?: string | null
}): Promise<{ record: GuestOrderRecord; token: string }> {
  const orderKey = mintGuestOrderKey()
  const token = guestTokenFor(orderKey)
  const guestId = newGuestId()
  const createdAt = new Date().toISOString()

  const record: GuestOrderRecord = {
    orderKey,
    guestId,
    name: params.contact.name,
    email: params.contact.email,
    phone: params.contact.phone,
    eventId: String(params.eventId),
    status: 'pending',
    ticketIds: [],
    claimedByUid: null,
    createdAt,
  }

  await adminDb
    .collection('guest_orders')
    .doc(orderKey)
    .set({
      guest_id: guestId,
      name: record.name,
      email: record.email,
      phone: record.phone,
      event_id: record.eventId,
      status: 'pending',
      ticket_ids: [],
      claimed_by_uid: null,
      ip_address: params.ipAddress || null,
      created_at: createdAt,
      updated_at: createdAt,
    })

  return { record, token }
}

function toRecord(id: string, data: any): GuestOrderRecord {
  return {
    orderKey: id,
    guestId: String(data?.guest_id || ''),
    name: String(data?.name || ''),
    email: String(data?.email || ''),
    phone: String(data?.phone || ''),
    eventId: String(data?.event_id || ''),
    status: data?.status === 'issued' ? 'issued' : 'pending',
    ticketIds: Array.isArray(data?.ticket_ids) ? data.ticket_ids.map(String) : [],
    claimedByUid: data?.claimed_by_uid ? String(data.claimed_by_uid) : null,
    createdAt: String(data?.created_at || ''),
  }
}

/** Look up a guest order by the token from a retrieval link. Verifies the signature first. */
export async function getGuestOrderByToken(token: string): Promise<GuestOrderRecord | null> {
  const orderKey = verifyGuestToken(token)
  if (!orderKey) return null
  return getGuestOrderByKey(orderKey)
}

/** Look up by order key (server-internal: fulfillment already holds the key). */
export async function getGuestOrderByKey(orderKey: string): Promise<GuestOrderRecord | null> {
  const key = String(orderKey || '').trim()
  if (!/^[a-f0-9]{48}$/.test(key)) return null
  const snap = await adminDb.collection('guest_orders').doc(key).get()
  if (!snap.exists) return null
  return toRecord(snap.id, snap.data())
}

/** Record the tickets an order produced, so the retrieval link can render them. */
export async function attachTicketsToGuestOrder(
  orderKey: string,
  ticketIds: string[]
): Promise<void> {
  const key = String(orderKey || '').trim()
  if (!/^[a-f0-9]{48}$/.test(key) || ticketIds.length === 0) return
  try {
    await adminDb
      .collection('guest_orders')
      .doc(key)
      .set(
        {
          status: 'issued',
          ticket_ids: ticketIds.map(String),
          issued_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      )
  } catch (err) {
    // Never fail an already-paid order over bookkeeping; the tickets themselves
    // carry guest_email/guest_phone so support can still find them.
    console.error('[guest] failed to attach tickets to guest order', (err as any)?.message)
  }
}

/**
 * Every issued guest order matching a contact detail, newest first.
 *
 * Used only by the "email me my ticket link again" flow, which mails the links to
 * the address ON FILE and never returns them to the caller — so this cannot be used
 * to enumerate somebody else's tickets by typing their email.
 */
export async function findIssuedGuestOrdersByContact(params: {
  email?: string
  phone?: string
  limit?: number
}): Promise<GuestOrderRecord[]> {
  const limit = Math.max(1, Math.min(20, params.limit || 10))
  const field = params.email ? 'email' : params.phone ? 'phone' : null
  const value = params.email || params.phone
  if (!field || !value) return []

  // Single-field equality — auto-indexed, no composite index needed. Status is
  // filtered in memory for the same reason.
  const snap = await adminDb.collection('guest_orders').where(field, '==', value).limit(50).get()
  return snap.docs
    .map((d: any) => toRecord(d.id, d.data()))
    .filter((r: GuestOrderRecord) => r.status === 'issued' && r.ticketIds.length > 0)
    .sort((a: GuestOrderRecord, b: GuestOrderRecord) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
}

/** Link a guest order to the account a buyer created afterwards. */
export async function markGuestOrderClaimed(orderKey: string, uid: string): Promise<void> {
  const key = String(orderKey || '').trim()
  if (!/^[a-f0-9]{48}$/.test(key) || !uid) return
  await adminDb
    .collection('guest_orders')
    .doc(key)
    .set({ claimed_by_uid: String(uid), updated_at: new Date().toISOString() }, { merge: true })
}

/** The buyer-facing retrieval link. Given only to the buyer, over their own channel. */
export function guestTicketUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tikem.co'
  return `${appUrl.replace(/\/+$/, '')}/tickets/guest/${encodeURIComponent(token)}`
}
