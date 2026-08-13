import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Resolve one `payout_review_queue/{eventId}` row.
 *
 * A row sitting at `status: 'pending'` is a hard block: /api/cron/release-payouts
 * refuses to release that event's money while it is there, and re-stamps the row
 * on every run. Both actions here move it OFF pending, which is what unblocks the
 * automatic path:
 *
 *   release — an admin has looked and is satisfied. The block is lifted, so the
 *     next release run pays the event as soon as its own rules allow.
 *   dismiss — an admin has looked and does NOT want this paid. The row is closed
 *     so it stops re-appearing, and no money moves.
 *
 * Deliberately NOT a delete: the cron treats a missing row as "never reviewed"
 * and would immediately write a fresh pending one, losing the decision and
 * re-queuing the same event forever. It also treats any non-pending row as an
 * admin's answer and leaves it exactly as written — so the stored status IS the
 * record of who decided what.
 *
 * This route never talks to Stripe. Money only ever moves inside the release
 * cron, which holds the balance, idempotency and entitlement caps; an admin
 * decision here is an input to that job, not a second payout path.
 */

type Action = 'release' | 'dismiss'

const STATUS_FOR: Record<Action, string> = {
  release: 'released',
  dismiss: 'dismissed',
}

/** Existing audit action codes — see lib/admin/audit-log.ts. */
const AUDIT_FOR: Record<Action, 'payout.release.manual' | 'payout.release.hold'> = {
  release: 'payout.release.manual',
  dismiss: 'payout.release.hold',
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) return adminError('Unauthorized', 401)

    const { eventId } = await params
    if (!eventId) return adminError('Missing event id', 400)

    const body = await request.json().catch(() => ({}))
    const action = String((body as any)?.action || '') as Action
    if (action !== 'release' && action !== 'dismiss') {
      return adminError('Invalid action', 400, "action must be 'release' or 'dismiss'")
    }

    const note = String((body as any)?.note || '').trim().slice(0, 500)
    const nextStatus = STATUS_FOR[action]
    const ref = adminDb.collection('payout_review_queue').doc(eventId)

    // Transactional so two admins clicking at once cannot both "win" — the loser
    // gets a 409 describing what actually happened instead of a silent overwrite.
    const result = await adminDb.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(ref)
      if (!snap.exists) throw new Error('Review item not found')

      const data = (snap.data() || {}) as any
      const currentStatus = String(data.status || 'pending')

      if (currentStatus === nextStatus) {
        return { idempotent: true, before: data, item: { eventId, ...data } }
      }
      if (currentStatus !== 'pending') {
        return { conflict: true, item: { eventId, ...data } }
      }

      const now = new Date().toISOString()
      const patch = {
        status: nextStatus,
        resolution: action,
        resolvedAt: now,
        resolvedBy: user.id,
        resolvedByEmail: user.email || '',
        ...(note ? { note } : {}),
        updatedAt: now,
      }
      transaction.set(ref, patch, { merge: true })

      return { idempotent: false, before: data, item: { eventId, ...data, ...patch } }
    })

    if ((result as any)?.conflict) {
      const status = String((result as any)?.item?.status || 'unknown')
      return adminError(
        'Review item already resolved',
        409,
        `This payout was already ${status}${(result as any)?.item?.resolvedByEmail ? ` by ${(result as any).item.resolvedByEmail}` : ''}.`
      )
    }

    const item = (result as any).item
    const idempotent = Boolean((result as any).idempotent)

    if (!idempotent) {
      logAdminAction({
        action: AUDIT_FOR[action],
        adminId: user.id,
        adminEmail: user.email || 'unknown',
        resourceType: 'payout_review_queue',
        resourceId: eventId,
        details: {
          eventId,
          organizerId: item?.organizerId || null,
          amountMinor: item?.amountMinor ?? null,
          currency: item?.currency || null,
          reason: item?.reason || null,
          tier: item?.tier || null,
          decision: action,
          beforeStatus: (result as any)?.before?.status || 'pending',
          afterStatus: nextStatus,
          note: note || null,
        },
      }).catch(() => {})
    }

    return adminOk({ item, idempotent })
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'Review item not found') {
      return adminError('Review item not found', 404, message)
    }
    console.error('Error resolving payout review item:', error)
    return NextResponse.json(
      { ok: false, success: false, error: 'Failed to resolve review item', details: message },
      { status: 500 }
    )
  }
}
