/**
 * Promo code utilities.
 *
 * The server-side promo system is unified on **Firestore** (the store the mobile
 * app already writes to). Promo codes live in `promo_codes` and redemptions in
 * `promo_code_usage`. All writes to `uses_count` / redemptions go through the
 * Admin SDK here (never from clients — see firestore.rules), and the usage cap
 * (`max_uses`) is enforced atomically in a Firestore transaction at the moment a
 * purchase is CONFIRMED (Stripe webhook, MonCash return, Sogepay callback).
 */

import { adminDb } from '@/lib/firebase/admin'
import { getPromoExpiresAt, getPromoUsesCount, isPromoActive } from '@/lib/promo-code-shared'

export interface PromoDoc {
  id: string
  event_id: string
  code: string
  // Mobile writes 'fixed_amount'; some legacy docs use 'fixed'. Anything that is
  // not 'percentage' is treated as a fixed-amount discount by calculateDiscount.
  discount_type: 'percentage' | 'fixed_amount' | 'fixed' | string
  discount_value: number
  max_uses: number | null
  uses_count: number
  is_active?: boolean
  expires_at?: string | null
  [key: string]: any
}

interface DiscountInput {
  discount_type: 'percentage' | 'fixed_amount' | 'fixed' | string
  discount_value: number
}

export function calculateDiscount(
  originalPrice: number,
  promoCode: DiscountInput
): { discountedPrice: number; discountAmount: number } {
  let discountAmount = 0

  if (promoCode.discount_type === 'percentage') {
    discountAmount = (originalPrice * promoCode.discount_value) / 100
  } else {
    // 'fixed_amount' | 'fixed' | anything else → flat amount off
    discountAmount = promoCode.discount_value
  }

  // Guard rail: discount can never exceed the price (integer-cents-safe callers
  // compute cents downstream; here we keep the same rounding the app already used).
  discountAmount = Math.min(Math.max(0, discountAmount), originalPrice)

  const discountedPrice = Math.max(0, originalPrice - discountAmount)

  return {
    discountedPrice: Math.round(discountedPrice * 100) / 100, // Round to 2 decimals
    discountAmount: Math.round(discountAmount * 100) / 100,
  }
}

export function formatDiscount(promoCode: DiscountInput): string {
  if (promoCode.discount_type === 'percentage') {
    return `${promoCode.discount_value}% off`
  }
  return `$${promoCode.discount_value} off`
}

/**
 * Low-level lookup: find a promo doc for an event by EITHER its Firestore doc id
 * OR its raw code string (the mobile client may pass either). Returns the doc
 * (with id) or null. Performs NO validity checks beyond confirming the doc
 * belongs to `eventId` — callers layer active/expiry/cap checks on top.
 */
export async function findPromoDoc(
  eventId: string,
  codeOrId: string | null | undefined
): Promise<PromoDoc | null> {
  if (!eventId || !codeOrId) return null
  const raw = String(codeOrId).trim()
  if (!raw) return null

  // 1) Try treating the value as a Firestore document id.
  try {
    const byId = await adminDb.collection('promo_codes').doc(raw).get()
    if (byId.exists) {
      const data = { id: byId.id, ...(byId.data() as any) } as PromoDoc
      if (String(data.event_id) === String(eventId)) return data
      // A doc id that belongs to a different event must NOT be honored.
      return null
    }
  } catch {
    // Fall through to code lookup (e.g. invalid id characters).
  }

  // 2) Fall back to a code lookup for this event (normalized upper-case).
  const normalized = raw.toUpperCase()
  const snap = await adminDb
    .collection('promo_codes')
    .where('event_id', '==', eventId)
    .where('code', '==', normalized)
    .limit(1)
    .get()

  if (!snap.empty) {
    const d = snap.docs[0]
    return { id: d.id, ...(d.data() as any) } as PromoDoc
  }

  return null
}

/**
 * Resolve an ACTIVE, non-expired promo for `eventId`, accepting either the
 * Firestore doc id or the raw code. Returns the promo doc or null.
 *
 * NOTE: this intentionally does NOT reject on cap-reached — the cap is enforced
 * atomically at redemption time (redeemPromoInTransaction). Callers that price a
 * charge should additionally consult promoCapacityRemaining() so an
 * already-exhausted promo charges full price instead of a discount that can't be
 * redeemed.
 */
export async function resolvePromoCode(
  eventId: string,
  codeOrId: string | null | undefined
): Promise<PromoDoc | null> {
  const promo = await findPromoDoc(eventId, codeOrId)
  if (!promo) return null

  if (!isPromoActive(promo)) return null

  const expiresAt = getPromoExpiresAt(promo)
  if (expiresAt && expiresAt.getTime() < Date.now()) return null

  return promo
}

/**
 * Remaining redemptions for a promo: null means unlimited (no max_uses), else the
 * non-negative number of uses still available. Soft/non-atomic — use only to
 * decide whether to APPLY a discount when pricing a charge. The authoritative cap
 * lives in redeemPromoInTransaction.
 */
export function promoCapacityRemaining(promo: {
  max_uses?: number | null
  uses_count?: number
  [key: string]: any
}): number | null {
  const max = promo?.max_uses
  if (max === null || max === undefined) return null
  const maxN = Number(max)
  if (!Number.isFinite(maxN)) return null
  return Math.max(0, maxN - getPromoUsesCount(promo))
}

/** True when a discount should be applied (unlimited, or at least 1 slot left). */
export function promoHasCapacity(promo: {
  max_uses?: number | null
  uses_count?: number
  [key: string]: any
}): boolean {
  const remaining = promoCapacityRemaining(promo)
  return remaining === null || remaining > 0
}

export interface RedeemResult {
  /** True only when uses_count was atomically incremented for this call. */
  redeemed: boolean
  /** True when the increment was refused because the cap would be exceeded. */
  capReached: boolean
  usesCountAfter?: number
}

/**
 * Atomically redeem a promo: in a Firestore transaction, re-read
 * uses_count/max_uses and only if `max_uses == null || uses_count + qty <=
 * max_uses` increment uses_count by qty and record a redemption doc in
 * `promo_code_usage`. Otherwise no-op and report capReached so the caller can
 * charge full price (at pricing time) or simply log (at confirm time, where the
 * discounted amount was already charged).
 *
 * This is the single authoritative enforcement point for the usage cap. It MUST
 * be called only when a purchase is CONFIRMED (payment succeeded + tickets
 * issued), so an abandoned checkout never consumes a slot.
 */
export async function redeemPromoInTransaction(params: {
  promoId: string
  qty: number
  userId?: string | null
  eventId?: string | null
  discountApplied?: number | null
}): Promise<RedeemResult> {
  const { promoId } = params
  const qty = Math.max(0, Math.floor(Number(params.qty) || 0))
  if (!promoId || qty <= 0) return { redeemed: false, capReached: false }

  const promoRef = adminDb.collection('promo_codes').doc(promoId)
  // Pre-generate the redemption ref so it can be written inside the transaction.
  const usageRef = adminDb.collection('promo_code_usage').doc()

  try {
    return await adminDb.runTransaction(async (tx: any) => {
      const snap = await tx.get(promoRef)
      if (!snap.exists) {
        return { redeemed: false, capReached: false } as RedeemResult
      }

      const data = snap.data() || {}
      const max = data.max_uses
      const unlimited = max === null || max === undefined || !Number.isFinite(Number(max))
      const used = getPromoUsesCount(data)

      if (!unlimited && used + qty > Number(max)) {
        return { redeemed: false, capReached: true } as RedeemResult
      }

      const now = new Date().toISOString()
      tx.update(promoRef, { uses_count: used + qty, updated_at: now })
      tx.set(usageRef, {
        promo_code_id: promoId,
        user_id: params.userId ?? null,
        event_id: params.eventId ?? null,
        discount_applied:
          typeof params.discountApplied === 'number' && Number.isFinite(params.discountApplied)
            ? params.discountApplied
            : null,
        qty,
        created_at: now,
      })

      return { redeemed: true, capReached: false, usesCountAfter: used + qty } as RedeemResult
    })
  } catch (e) {
    // Never let a redemption bookkeeping failure break an already-confirmed sale.
    console.error('[promo] redeemPromoInTransaction failed', {
      promoId,
      message: (e as any)?.message,
    })
    return { redeemed: false, capReached: false }
  }
}
