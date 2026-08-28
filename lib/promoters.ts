/**
 * Event promoters: per-event referral codes with a commission ledger.
 *
 * A promoter is a record the ORGANIZER creates on their own event — a street-team
 * member, an anbasadè, an influencer — who shares a personal event link
 * (`/events/{id}?ref=CODE`). Sales made through that link are attributed to them
 * and a commission the organizer owes them is ledgered in `promoter_sales`.
 *
 * The architecture deliberately mirrors promo codes end to end:
 *  - untrusted client input is re-resolved server-side (resolvePromoterCode),
 *  - only the resolved doc id rides on the payment (PI metadata /
 *    pending_transactions),
 *  - bookkeeping happens exactly once, inside the fulfillment claim
 *    (recordPromoterSale), and never breaks a confirmed sale.
 *
 * The promoter's stats page is reached by an HMAC token derived from the record's
 * `stats_key` — the guest-ticket-link pattern: deterministic re-derivation, no
 * bearer credential stored, constant-time verification.
 */

import crypto from 'crypto'
import { adminDb } from '@/lib/firebase/admin'

export interface PromoterDoc {
  id: string
  event_id: string
  organizer_id: string
  code: string
  name: string
  contact?: string | null
  commission_type: 'percentage' | 'flat_per_ticket' | string
  commission_value: number
  is_active?: boolean
  stats_key: string
  claimed_by_uid?: string | null
  tickets_sold?: number
  orders_count?: number
  gross_cents?: number
  commission_cents?: number
  currency?: string
  [key: string]: any
}

/** Uppercased, short, link-safe. Same alphabet a promoter can read aloud. */
export const PROMOTER_CODE_PATTERN = /^[A-Z0-9_-]{2,24}$/

/**
 * Normalize a raw `?ref=` value. Returns the canonical code or null — never
 * throws, because an unusable ref must never block a purchase.
 */
export function normalizePromoterCode(raw: unknown): string | null {
  const code = String(raw ?? '').trim().toUpperCase()
  if (!code || !PROMOTER_CODE_PATTERN.test(code)) return null
  return code
}

/**
 * Low-level lookup by Firestore doc id OR raw code, scoped to the event.
 * No validity checks beyond event ownership of the doc — mirrors findPromoDoc.
 */
export async function findPromoterDoc(
  eventId: string,
  codeOrId: string | null | undefined
): Promise<PromoterDoc | null> {
  if (!eventId || !codeOrId) return null
  const raw = String(codeOrId).trim()
  if (!raw) return null

  try {
    const byId = await adminDb.collection('event_promoters').doc(raw).get()
    if (byId.exists) {
      const data = { id: byId.id, ...(byId.data() as any) } as PromoterDoc
      if (String(data.event_id) === String(eventId)) return data
      // A doc id that belongs to a different event must NOT be honored.
      return null
    }
  } catch {
    // Fall through to code lookup (e.g. invalid id characters).
  }

  const normalized = normalizePromoterCode(raw)
  if (!normalized) return null

  const snap = await adminDb
    .collection('event_promoters')
    .where('event_id', '==', eventId)
    .where('code', '==', normalized)
    .limit(1)
    .get()

  if (!snap.empty) {
    const d = snap.docs[0]
    return { id: d.id, ...(d.data() as any) } as PromoterDoc
  }
  return null
}

/**
 * Resolve an ACTIVE promoter for the event. Anything else — unknown code,
 * deactivated, wrong event — resolves to null and the sale simply proceeds
 * unattributed. There is nothing to enumerate: the response never distinguishes
 * "no such code" from "inactive".
 */
export async function resolvePromoterCode(
  eventId: string,
  codeOrId: string | null | undefined
): Promise<PromoterDoc | null> {
  const promoter = await findPromoterDoc(eventId, codeOrId)
  if (!promoter) return null
  if (promoter.is_active === false) return null
  return promoter
}

// ── Commission ────────────────────────────────────────────────────────────────

/**
 * Commission for one fulfilled order, in event-currency cents.
 *
 * Free orders earn 0 under BOTH types: a flat fee on a zero-revenue ticket would
 * obligate money the organizer never received.
 */
export function calculateCommissionCents(
  promoter: Pick<PromoterDoc, 'commission_type' | 'commission_value'>,
  orderGrossCents: number,
  quantity: number
): number {
  const gross = Math.max(0, Math.round(Number(orderGrossCents) || 0))
  const qty = Math.max(0, Math.round(Number(quantity) || 0))
  const value = Number(promoter?.commission_value)
  if (gross <= 0 || qty <= 0 || !Number.isFinite(value) || value <= 0) return 0

  if (promoter.commission_type === 'flat_per_ticket') {
    // value is event-currency cents per ticket; never exceed the order's gross.
    return Math.min(gross, Math.round(value) * qty)
  }
  // Default: percentage of the order's face value (after promo discounts).
  const pct = Math.min(100, value)
  return Math.min(gross, Math.round((gross * pct) / 100))
}

// ── Stats-page token (guest-link pattern) ─────────────────────────────────────

/**
 * HMAC key for promoter stats links. Prefers a dedicated secret, then the guest
 * link secrets, then a key derived from the Firebase credential — same fallback
 * discipline as lib/guest/identity.ts: a promoter is always handed a working
 * link rather than a deploy silently breaking stats delivery.
 */
function promoterLinkSecret(): Buffer {
  const explicit =
    process.env.PROMOTER_LINK_SECRET?.trim() ||
    process.env.GUEST_TICKET_LINK_SECRET?.trim() ||
    process.env.WALLET_PASS_LINK_SECRET?.trim()
  if (explicit) return Buffer.from(explicit, 'utf8')

  const derivedFrom = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  return crypto
    .createHash('sha256')
    .update(`tikem-promoter-link|${derivedFrom || 'unconfigured'}`)
    .digest()
}

function signStatsKey(statsKey: string): string {
  return crypto
    .createHmac('sha256', promoterLinkSecret())
    .update(statsKey)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    .slice(0, 22)
}

/** A fresh, unguessable stats key for a new promoter record. */
export function mintPromoterStatsKey(): string {
  return crypto.randomBytes(24).toString('hex')
}

/** Build the stats token for a promoter's stats_key. Deterministic — re-derivable. */
export function promoterTokenFor(statsKey: string): string {
  return `${statsKey}.${signStatsKey(statsKey)}`
}

/**
 * Verify a stats token and return the stats_key it names, or null. Constant-time
 * comparison; forged and malformed tokens are indistinguishable to the caller.
 */
export function verifyPromoterToken(token: unknown): string | null {
  const raw = String(token ?? '').trim()
  if (!raw || raw.length > 200) return null

  const parts = raw.split('.')
  if (parts.length !== 2) return null
  const [statsKey, providedSignature] = parts
  if (!/^[a-f0-9]{48}$/.test(statsKey) || !providedSignature) return null

  const expected = Buffer.from(signStatsKey(statsKey), 'utf8')
  const provided = Buffer.from(providedSignature, 'utf8')
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null
  }
  return statsKey
}

export async function getPromoterByStatsKey(statsKey: string): Promise<PromoterDoc | null> {
  if (!/^[a-f0-9]{48}$/.test(String(statsKey || ''))) return null
  const snap = await adminDb
    .collection('event_promoters')
    .where('stats_key', '==', statsKey)
    .limit(1)
    .get()
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...(d.data() as any) } as PromoterDoc
}

// ── Sale ledger ───────────────────────────────────────────────────────────────

export interface RecordPromoterSaleParams {
  promoterId: string
  eventId: string
  ticketIds: string[]
  quantity: number
  /** Order face value after promo discounts, event-currency cents. */
  orderGrossCents: number
  currency: string
  paymentMethod: string
  paymentId?: string | null
  /** Stable buyer identity for support/audit: a uid, else a normalized email. */
  buyerUserId?: string | null
  buyerEmail?: string | null
}

/**
 * Record one fulfilled order against its promoter: append a `promoter_sales`
 * row and bump the promoter's counters, atomically.
 *
 * Called INSIDE the caller's fulfillment claim, so it runs at most once per
 * order. Like promo redemption, a bookkeeping failure must never break a
 * confirmed sale: this function catches everything, logs loudly, and reports
 * `recorded: false` for reconciliation.
 */
export async function recordPromoterSale(
  params: RecordPromoterSaleParams
): Promise<{ recorded: boolean; commissionCents: number }> {
  try {
    const promoterRef = adminDb.collection('event_promoters').doc(String(params.promoterId))
    const saleRef = adminDb.collection('promoter_sales').doc()

    let commissionCents = 0
    await adminDb.runTransaction(async (tx: any) => {
      const snap = await tx.get(promoterRef)
      if (!snap.exists) throw new Error(`promoter ${params.promoterId} not found`)
      const promoter = snap.data() as PromoterDoc
      if (String(promoter.event_id) !== String(params.eventId)) {
        throw new Error(`promoter ${params.promoterId} belongs to another event`)
      }

      const quantity = Math.max(1, Math.round(Number(params.quantity) || 1))
      const orderGrossCents = Math.max(0, Math.round(Number(params.orderGrossCents) || 0))
      commissionCents = calculateCommissionCents(promoter, orderGrossCents, quantity)

      const buyerUid = String(params.buyerUserId || '').trim()
      const buyerEmail = String(params.buyerEmail || '').trim().toLowerCase()
      const buyerKey = buyerUid && !buyerUid.startsWith('guest_')
        ? `uid:${buyerUid}`
        : buyerEmail
        ? `email:${buyerEmail}`
        : null

      tx.set(saleRef, {
        promoter_id: promoterRef.id,
        event_id: String(params.eventId),
        organizer_id: String(promoter.organizer_id || ''),
        ref_code: String(promoter.code || ''),
        ticket_ids: (params.ticketIds || []).map(String),
        quantity,
        order_gross_cents: orderGrossCents,
        commission_type: promoter.commission_type === 'flat_per_ticket' ? 'flat_per_ticket' : 'percentage',
        commission_value: Number(promoter.commission_value) || 0,
        commission_cents: commissionCents,
        currency: String(params.currency || promoter.currency || 'HTG').toUpperCase(),
        payment_method: String(params.paymentMethod || 'unknown'),
        payment_id: params.paymentId ? String(params.paymentId) : null,
        buyer_key: buyerKey,
        status: 'accrued',
        created_at: new Date().toISOString(),
      })

      tx.update(promoterRef, {
        tickets_sold: (Number(promoter.tickets_sold) || 0) + quantity,
        orders_count: (Number(promoter.orders_count) || 0) + 1,
        gross_cents: (Number(promoter.gross_cents) || 0) + orderGrossCents,
        commission_cents: (Number(promoter.commission_cents) || 0) + commissionCents,
        updated_at: new Date().toISOString(),
      })
    })

    return { recorded: true, commissionCents }
  } catch (err: any) {
    console.error('[promoters] failed to record sale (sale is kept; reconcile manually)', {
      promoterId: params.promoterId,
      eventId: params.eventId,
      message: err?.message,
    })
    return { recorded: false, commissionCents: 0 }
  }
}

/**
 * Reverse the promoter accrual for a refunded/cancelled ticket's order.
 * Marks the matching accrued `promoter_sales` row reversed and decrements the
 * promoter's counters. v1 reverses whole orders — partial-quantity refunds do
 * not exist in the product.
 */
export async function reversePromoterSaleForTicket(ticketId: string): Promise<boolean> {
  try {
    const snap = await adminDb
      .collection('promoter_sales')
      .where('ticket_ids', 'array-contains', String(ticketId))
      .limit(1)
      .get()
    if (snap.empty) return false

    const saleDoc = snap.docs[0]
    const sale = saleDoc.data() as any
    if (sale.status !== 'accrued') return false

    const promoterRef = adminDb.collection('event_promoters').doc(String(sale.promoter_id))
    await adminDb.runTransaction(async (tx: any) => {
      const fresh = await tx.get(saleDoc.ref)
      if (!fresh.exists || (fresh.data() as any).status !== 'accrued') return
      const promoterSnap = await tx.get(promoterRef)

      tx.update(saleDoc.ref, { status: 'reversed', reversed_at: new Date().toISOString() })
      if (promoterSnap.exists) {
        const p = promoterSnap.data() as PromoterDoc
        tx.update(promoterRef, {
          tickets_sold: Math.max(0, (Number(p.tickets_sold) || 0) - (Number(sale.quantity) || 0)),
          orders_count: Math.max(0, (Number(p.orders_count) || 0) - 1),
          gross_cents: Math.max(0, (Number(p.gross_cents) || 0) - (Number(sale.order_gross_cents) || 0)),
          commission_cents: Math.max(0, (Number(p.commission_cents) || 0) - (Number(sale.commission_cents) || 0)),
          updated_at: new Date().toISOString(),
        })
      }
    })
    return true
  } catch (err: any) {
    console.error('[promoters] failed to reverse sale', { ticketId, message: err?.message })
    return false
  }
}
