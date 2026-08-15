/**
 * Reads the Needs You landing rows from Firestore.
 *
 * Uses the same equality-only shape as queue-summary.ts, and for the same
 * reasons: the ordered form needs composite indexes that mostly do not exist,
 * and — verified against live data — 8 of 11 verification_requests documents
 * carry only `created_at` while others carry `createdAt`, so ordering by any
 * single field name makes Firestore silently drop most of the queue. Dating a
 * document by whichever field it actually has is the only correct read here.
 *
 * A queue that fails returns [] rather than throwing: one cold index must not
 * empty the whole landing.
 */

import { adminDb } from '@/lib/firebase/admin'
import { docAge } from '@/lib/admin/queue-summary'
import { mergeNeedsYou, type NeedsYouItem } from '@/lib/admin/needs-you'

/** Cap per queue: the landing is a triage list, not a full backlog export. */
const PER_QUEUE = 25

async function readQueue(
  build: () => FirebaseFirestore.Query,
  preferredAgeField: string,
  toItem: (id: string, data: any, createdAt: string | null) => NeedsYouItem
): Promise<NeedsYouItem[]> {
  try {
    const snap = await build().limit(PER_QUEUE).get()
    return (snap.docs as any[]).map((doc) => {
      const data = doc.data() || {}
      return toItem(doc.id, data, docAge(data, preferredAgeField))
    })
  } catch (error) {
    console.warn('[admin/needs-you] queue read failed', error)
    return []
  }
}

export async function getNeedsYouItems(): Promise<NeedsYouItem[]> {
  const events = () => adminDb.collection('events')

  const groups = await Promise.all([
    readQueue(
      () =>
        adminDb
          .collection('verification_requests')
          .where('status', 'in', ['pending_review', 'in_review', 'pending']),
      'createdAt',
      (id, d, createdAt) => ({
        id,
        queue: 'verifications',
        subject: d.businessName || d.full_name || d.email || 'Unknown organizer',
        decision: 'ID verification',
        href: '/admin/verify',
        createdAt,
      })
    ),
    readQueue(
      () =>
        adminDb
          .collectionGroup('verificationDocuments')
          .where('type', '==', 'bank')
          .where('status', '==', 'pending'),
      'submittedAt',
      (id, d, createdAt) => ({
        id,
        queue: 'bankVerifications',
        subject: d.accountName || d.bankName || 'Bank account',
        decision: 'bank verification',
        href: '/admin/bank-verifications',
        createdAt,
      })
    ),
    readQueue(
      () => adminDb.collection('payout_review_queue').where('status', '==', 'pending'),
      'createdAt',
      (id, d, createdAt) => ({
        id,
        queue: 'payoutReview',
        subject: d.organizerName || d.organizerId || 'Payout',
        decision: 'payout review',
        href: '/admin/payouts/review',
        createdAt,
      })
    ),
    readQueue(
      () => adminDb.collectionGroup('payouts').where('status', 'in', ['pending', 'approved']),
      'createdAt',
      (id, d, createdAt) => ({
        id,
        queue: 'disbursements',
        subject: d.organizerName || d.organizerId || 'Disbursement',
        decision: 'disbursement',
        href: '/admin/disbursements',
        createdAt,
      })
    ),
    readQueue(
      () => adminDb.collection('withdrawal_requests').where('status', '==', 'pending'),
      'createdAt',
      (id, d, createdAt) => ({
        id,
        queue: 'withdrawals',
        subject: d.organizerName || d.organizerId || 'Withdrawal',
        decision: 'withdrawal',
        href: '/admin/withdrawals',
        createdAt,
      })
    ),
    readQueue(
      () => adminDb.collection('disputes').where('status', '==', 'open'),
      'updatedAt',
      (id, d, createdAt) => ({
        id,
        queue: 'disputes',
        subject: d.subject || d.orderId || 'Dispute',
        decision: 'dispute',
        href: '/admin/disputes',
        createdAt,
      })
    ),
    readQueue(
      () => events().where('is_published', '==', false).where('rejected', '==', false),
      'created_at',
      (id, d, createdAt) => ({
        id,
        queue: 'pendingEvents',
        subject: d.title || 'Untitled event',
        decision: 'event approval',
        href: '/admin/events',
        createdAt,
      })
    ),
    readQueue(
      () => events().where('reports_count', '>', 0),
      'created_at',
      (id, d, createdAt) => ({
        id,
        queue: 'reportedEvents',
        subject: d.title || 'Untitled event',
        decision: `reported ×${d.reports_count ?? 1}`,
        href: '/admin/events',
        createdAt,
      })
    ),
  ])

  return mergeNeedsYou(groups)
}
