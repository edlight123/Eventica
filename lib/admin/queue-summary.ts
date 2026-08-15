/**
 * Per-queue "how many, and how long has the oldest been waiting" for the admin
 * sidebar and the Needs You landing.
 *
 * Every source degrades on its own. lib/firestore/admin.ts already wraps its
 * verification counts in a fallback because these queries fail while an index is
 * cold — so one failing queue must return null rather than emptying the rail.
 * null (unreadable) and {count: 0} (cleared) are deliberately different values,
 * and the sidebar renders them differently.
 */

import { adminDb } from '@/lib/firebase/admin'
import type { QueueStat, QueueSummary } from '@/lib/admin/queue-keys'

// The taxonomy lives in queue-keys.ts (no imports, so it is testable and safe in
// client bundles). Re-exported here so server callers have one import site.
export {
  QUEUE_KEYS,
  RAIL_GROUPS,
  railStat,
  type QueueKey,
  type QueueStat,
  type QueueSummary,
  type RailGroup,
} from '@/lib/admin/queue-keys'

function toIso(value: any): string | null {
  if (!value) return null
  if (typeof value?.toDate === 'function') {
    const d = value.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : value
  }
  return null
}

/** One aggregation for the count, one 1-doc ascending read for the oldest. */
async function statFor(build: () => FirebaseFirestore.Query, ageField: string): Promise<QueueStat> {
  try {
    const [countSnap, oldestSnap] = await Promise.all([
      build().count().get(),
      build().orderBy(ageField, 'asc').limit(1).get(),
    ])
    const count = countSnap.data().count || 0
    const oldestAt = oldestSnap.empty ? null : toIso(oldestSnap.docs[0].data()?.[ageField])
    return { count, oldestAt }
  } catch (error) {
    console.warn('[admin/queue-summary] queue read failed', error)
    return null
  }
}

/**
 * Reported events, which cannot use statFor.
 *
 * `reports_count > 0` is a range filter, and Firestore requires the first
 * orderBy to be the inequality's own field — so `.orderBy('created_at')` here
 * throws rather than returning rows (same constraint the events console handles
 * at app/api/admin/events/list/route.ts). Order by reports_count and take the
 * oldest created_at from the returned page instead.
 *
 * That makes oldestAt approximate: it is the oldest among the most-reported
 * events, not across every reported event. For a rail figure meant to answer
 * "am I behind", that is the right trade against a second index.
 */
async function reportedEventsStat(): Promise<QueueStat> {
  try {
    const reported = () => adminDb.collection('events').where('reports_count', '>', 0)
    const [countSnap, pageSnap] = await Promise.all([
      reported().count().get(),
      reported().orderBy('reports_count', 'desc').limit(50).get(),
    ])

    let oldestAt: string | null = null
    for (const doc of pageSnap.docs as any[]) {
      const iso = toIso(doc.data()?.created_at)
      if (iso && (oldestAt === null || iso < oldestAt)) oldestAt = iso
    }

    return { count: countSnap.data().count || 0, oldestAt }
  } catch (error) {
    console.warn('[admin/queue-summary] reported events read failed', error)
    return null
  }
}

/**
 * Every queue's figures. Runs the sources concurrently; a rejection in one
 * cannot reject the whole summary because each reader already catches.
 */
export async function getQueueSummary(): Promise<QueueSummary> {
  const [
    verifications,
    bankVerifications,
    payoutReview,
    disbursements,
    withdrawals,
    disputes,
    pendingEvents,
    reportedEvents,
  ] = await Promise.all([
    statFor(
      () =>
        adminDb
          .collection('verification_requests')
          .where('status', 'in', ['pending_review', 'in_review', 'pending']),
      'createdAt'
    ),
    statFor(
      () =>
        adminDb
          .collectionGroup('verificationDocuments')
          .where('type', '==', 'bank')
          .where('status', '==', 'pending'),
      'submittedAt'
    ),
    statFor(() => adminDb.collection('payout_review_queue').where('status', '==', 'pending'), 'createdAt'),
    statFor(
      () => adminDb.collectionGroup('payouts').where('status', 'in', ['pending', 'approved']),
      'createdAt'
    ),
    statFor(() => adminDb.collection('withdrawal_requests').where('status', '==', 'pending'), 'createdAt'),
    statFor(() => adminDb.collection('disputes').where('status', '==', 'open'), 'updatedAt'),
    statFor(
      () => adminDb.collection('events').where('is_published', '==', false).where('rejected', '==', false),
      'created_at'
    ),
    reportedEventsStat(),
  ])

  return {
    verifications,
    bankVerifications,
    payoutReview,
    disbursements,
    withdrawals,
    disputes,
    pendingEvents,
    reportedEvents,
  }
}
