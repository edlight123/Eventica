import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { DISPUTES_COLLECTION, describeDisputeReason, type DisputeOutcome } from '@/lib/disputes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Chargebacks, read side.
 *
 * The Stripe webhook writes one `disputes/{stripeDisputeId}` doc per chargeback
 * (see lib/disputes.ts). Tikèm is merchant of record on the Stripe rail, so every
 * one of these is money already debited from the PLATFORM balance — this is the
 * only place a human can see the whole set, including the ones that could not be
 * matched to a ticket and therefore need finding by hand.
 *
 * Read-only. Nothing here refunds, claws back, or changes a payout.
 */

/** Docs read in one pass. Disputes are rare; this is a generous ceiling. */
const MAX_DISPUTES = 200

export type AdminDisputeItem = {
  disputeId: string
  status: string
  outcome: DisputeOutcome | string
  isOpen: boolean
  reason: string | null
  reasonLabel: string
  amountMinor: number
  currency: string
  chargeId: string | null
  paymentIntentId: string | null
  evidenceDueBy: string | null
  evidenceSubmitted: boolean
  evidencePastDue: boolean
  fundsWithdrawnAt: string | null
  fundsReinstatedAt: string | null
  attributed: boolean
  unattributedReason: string | null
  lookupFailed: boolean
  ticketId: string | null
  eventId: string | null
  eventTitle: string | null
  organizerId: string | null
  organizerName: string | null
  organizerEmail: string | null
  attendeeName: string | null
  organizerNotifiedAt: string | null
  notifyError: string | null
  stripeCreatedAt: string | null
  firstSeenAt: string | null
  updatedAt: string | null
  closedAt: string | null
  lostAt: string | null
}

function toIso(value: any): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toISOString()
    } catch {
      return null
    }
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString()
  return null
}

function toMinor(value: unknown): number {
  const n = Number(value || 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function toItem(doc: any): AdminDisputeItem {
  const data = (doc.data() || {}) as any
  const attribution = (data.attribution || {}) as any
  const reason = data.reason ? String(data.reason) : null

  return {
    disputeId: String(data.disputeId || doc.id),
    status: String(data.status || 'unknown'),
    outcome: String(data.outcome || 'unknown'),
    isOpen: data.isOpen === true,
    reason,
    reasonLabel: describeDisputeReason(reason),
    amountMinor: Math.max(0, toMinor(data.amountMinor)),
    currency: String(data.currency || 'USD').toUpperCase(),
    chargeId: data.chargeId ? String(data.chargeId) : null,
    paymentIntentId: data.paymentIntentId ? String(data.paymentIntentId) : null,
    evidenceDueBy: toIso(data.evidenceDueBy),
    evidenceSubmitted: data.evidenceSubmitted === true,
    evidencePastDue: data.evidencePastDue === true,
    fundsWithdrawnAt: toIso(data.fundsWithdrawnAt),
    fundsReinstatedAt: toIso(data.fundsReinstatedAt),
    attributed: data.attributed === true || attribution.attributed === true,
    unattributedReason: attribution.unattributedReason ? String(attribution.unattributedReason) : null,
    lookupFailed: attribution.lookupFailed === true,
    ticketId: attribution.ticketId ? String(attribution.ticketId) : null,
    eventId: (data.eventId || attribution.eventId) ? String(data.eventId || attribution.eventId) : null,
    eventTitle: attribution.eventTitle ? String(attribution.eventTitle) : null,
    organizerId:
      (data.organizerId || attribution.organizerId) ? String(data.organizerId || attribution.organizerId) : null,
    organizerName: attribution.organizerName ? String(attribution.organizerName) : null,
    organizerEmail: attribution.organizerEmail ? String(attribution.organizerEmail) : null,
    attendeeName: attribution.attendeeName ? String(attribution.attendeeName) : null,
    organizerNotifiedAt: toIso(data.organizerNotifiedAt),
    notifyError: data.notifyError ? String(data.notifyError) : null,
    stripeCreatedAt: toIso(data.stripeCreatedAt),
    firstSeenAt: toIso(data.firstSeenAt),
    updatedAt: toIso(data.updatedAt),
    closedAt: toIso(data.closedAt),
    lostAt: toIso(data.lostAt),
  }
}

export async function GET() {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) return adminError('Unauthorized', 401)

    // One recency scan, no composite index: the collection is small and the page
    // splits open/closed client-side rather than paying for a second query.
    const snapshot = await adminDb
      .collection(DISPUTES_COLLECTION)
      .orderBy('updatedAt', 'desc')
      .limit(MAX_DISPUTES)
      .get()
      .catch(async (indexError: any) => {
        // A brand-new collection has no `updatedAt` index warm-up problem, but an
        // ordered read can still fail on an empty/legacy shape. Fall back to an
        // unordered read rather than showing an admin nothing.
        console.warn('[admin/disputes] ordered read failed; falling back', {
          message: indexError?.message,
        })
        return adminDb.collection(DISPUTES_COLLECTION).limit(MAX_DISPUTES).get()
      })

    const items = (snapshot.docs as any[]).map(toItem)
    items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))

    const open = items.filter((i) => i.isOpen)
    const closed = items.filter((i) => !i.isOpen)

    // Money is never summed across currencies — that would be arithmetic fiction.
    const openByCurrency: Record<string, number> = {}
    for (const item of open) {
      openByCurrency[item.currency] = (openByCurrency[item.currency] || 0) + item.amountMinor
    }
    const lostByCurrency: Record<string, number> = {}
    for (const item of items) {
      if (item.outcome !== 'lost') continue
      lostByCurrency[item.currency] = (lostByCurrency[item.currency] || 0) + item.amountMinor
    }

    return adminOk({
      open,
      closed,
      counts: {
        open: open.length,
        closed: closed.length,
        unattributed: items.filter((i) => !i.attributed).length,
        lost: items.filter((i) => i.outcome === 'lost').length,
        won: items.filter((i) => i.outcome === 'won').length,
        truncated: items.length >= MAX_DISPUTES,
      },
      openByCurrency,
      lostByCurrency,
    })
  } catch (error: any) {
    console.error('Error loading disputes:', error)
    return NextResponse.json(
      { ok: false, success: false, error: 'Failed to load disputes' },
      { status: 500 }
    )
  }
}
