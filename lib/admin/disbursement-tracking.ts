/**
 * Admin Event Disbursement Tracking
 * Shows events that have ended and are ready for payout processing
 */

import { adminDb } from '@/lib/firebase/admin'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { getDecryptedBankDestination } from '@/lib/firestore/payout-destinations'

/**
 * Run an async mapper over `items` with a bounded number of concurrent workers.
 * Preserves input order in the returned results.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const current = nextIndex++
      if (current >= items.length) return
      results[current] = await mapper(items[current], current)
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

export interface EventDisbursementInfo {
  eventId: string
  eventTitle: string
  organizerId: string
  organizerName: string
  organizerEmail: string
  
  // Event dates
  startDate: Date
  endDate: Date
  daysEnded: number
  
  // Financial info
  totalTicketsSold: number
  grossRevenue: number
  platformFee: number
  netRevenue: number
  currency: string
  
  // Payout status
  hasPendingPayout: boolean
  hasCompletedPayout: boolean
  payoutEligible: boolean
  
  // Bank info
  payoutMethod?: string
  bankInfo?: {
    accountName?: string
    accountNumber?: string
    accountNumberFull?: string
    bankName?: string
    routingNumber?: string
    swift?: string
    iban?: string
    mobileNumber?: string
    provider?: string
    mobileAccountName?: string
  }
}

/**
 * Get events that have ended and need payout processing
 */
export async function getEndedEventsForDisbursement(
  daysAgo: number = 365,
  limit: number = 500
): Promise<EventDisbursementInfo[]> {
  try {
    // Per-organizer caches. Many events share the same organizer, so we dedupe
    // organizer/profile/bank lookups across all events (and reuse in-flight promises).
    const organizerCache = new Map<string, Promise<any>>()
    const haitiProfileCache = new Map<string, Promise<any>>()
    const primaryBankCache = new Map<
      string,
      Promise<Awaited<ReturnType<typeof getDecryptedBankDestination>> | null>
    >()

    const getCachedOrganizer = (organizerId: string): Promise<any> => {
      const existing = organizerCache.get(organizerId)
      if (existing) return existing
      const p = adminDb
        .collection('users')
        .doc(organizerId)
        .get()
        .then((doc: any) => doc.data())
        .catch(() => undefined)
      organizerCache.set(organizerId, p)
      return p
    }

    const getCachedHaitiProfile = (organizerId: string): Promise<any> => {
      const existing = haitiProfileCache.get(organizerId)
      if (existing) return existing
      const p = getPayoutProfile(organizerId, 'haiti').catch(() => null)
      haitiProfileCache.set(organizerId, p)
      return p
    }

    const getCachedPrimaryBank = (
      organizerId: string
    ): Promise<Awaited<ReturnType<typeof getDecryptedBankDestination>> | null> => {
      const existing = primaryBankCache.get(organizerId)
      if (existing) return existing
      const p = getDecryptedBankDestination({ organizerId, destinationId: 'bank_primary' }).catch(() => null)
      primaryBankCache.set(organizerId, p)
      return p
    }

    const now = new Date()
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Get events that have ended
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('end_datetime', '<=', now)
      .where('end_datetime', '>=', cutoffDate)
      .orderBy('end_datetime', 'desc')
      .limit(limit)
      .get()

    const ticketStatusValues = ['confirmed', 'valid']

    const processEvent = async (eventDoc: any): Promise<EventDisbursementInfo | null> => {
      const event = eventDoc.data()
      const eventId = eventDoc.id
      const organizerId = event.organizer_id

      if (!organizerId) return null

      const [organizer, haitiProfile, payoutsSnapshot, ticketsByEventIdSnap, ticketsByEvent_idSnap] =
        await Promise.all([
          getCachedOrganizer(organizerId),
          getCachedHaitiProfile(organizerId),
          adminDb
            .collection('organizers')
            .doc(organizerId)
            .collection('payouts')
            .where('eventId', '==', eventId)
            .get(),
          adminDb
            .collection('tickets')
            .where('eventId', '==', eventId)
            .where('status', 'in', ticketStatusValues)
            .get(),
          adminDb
            .collection('tickets')
            .where('event_id', '==', eventId)
            .where('status', 'in', ticketStatusValues)
            .get(),
        ])

      const ticketsById = new Map<string, any>()
      for (const doc of ticketsByEventIdSnap.docs) ticketsById.set(doc.id, doc.data())
      for (const doc of ticketsByEvent_idSnap.docs) ticketsById.set(doc.id, doc.data())

      const tickets = Array.from(ticketsById.values())
      const totalTicketsSold = tickets.length

      // Calculate revenue
      let grossRevenue = 0
      const currency = event.currency || 'HTG'

      for (const ticket of tickets) {
        grossRevenue += ticket.price_paid || 0
      }

      // Platform fee (5% default)
      const platformFeeRate = 0.05
      const platformFee = grossRevenue * platformFeeRate
      const netRevenue = grossRevenue - platformFee

      const hasPendingPayout = payoutsSnapshot.docs.some(
        (doc: any) => doc.data().status === 'pending'
      )
      const hasCompletedPayout = payoutsSnapshot.docs.some(
        (doc: any) => ['paid', 'completed'].includes(doc.data().status)
      )

      // Event is eligible for payout if:
      // 1. Has ended
      // 2. Has sold tickets
      // 3. Doesn't have a completed payout
      // 4. Organizer has payout config set up
      const endDate = event.end_datetime?.toDate?.() || new Date(event.end_datetime)
      const daysEnded = Math.floor((now.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000))
      const payoutEligible =
        daysEnded >= 0 &&
        totalTicketsSold > 0 &&
        !hasCompletedPayout &&
        !!haitiProfile?.method

      // Extract bank info based on payment method
      let bankInfo: EventDisbursementInfo['bankInfo'] | undefined
      if (haitiProfile?.method === 'bank_transfer') {
        const decryptedPrimaryBank = await getCachedPrimaryBank(organizerId)
        const last4 = decryptedPrimaryBank?.accountNumber ? decryptedPrimaryBank.accountNumber.slice(-4) : undefined

        bankInfo = {
          accountName: decryptedPrimaryBank?.accountHolder || haitiProfile.bankDetails?.accountName,
          // Keep the table display value small; the modal can use accountNumberFull.
          accountNumber: haitiProfile.bankDetails?.accountNumber || (last4 ? `****${last4}` : undefined),
          accountNumberFull: decryptedPrimaryBank?.accountNumber,
          bankName: decryptedPrimaryBank?.bankName || haitiProfile.bankDetails?.bankName,
          routingNumber: decryptedPrimaryBank?.routingNumber || haitiProfile.bankDetails?.routingNumber,
          swift: decryptedPrimaryBank?.swiftCode || haitiProfile.bankDetails?.swift,
          iban: decryptedPrimaryBank?.iban || haitiProfile.bankDetails?.iban,
        }
      } else if (haitiProfile?.method === 'mobile_money') {
        bankInfo = {
          mobileNumber: haitiProfile.mobileMoneyDetails?.phoneNumber,
          provider: haitiProfile.mobileMoneyDetails?.provider,
          mobileAccountName: haitiProfile.mobileMoneyDetails?.accountName,
        }
      }

      return {
        eventId,
        eventTitle: event.title || 'Untitled Event',
        organizerId,
        organizerName: organizer?.full_name || 'Unknown',
        organizerEmail: organizer?.email || '',
        startDate: event.start_datetime?.toDate?.() || new Date(event.start_datetime),
        endDate,
        daysEnded,
        totalTicketsSold,
        grossRevenue,
        platformFee,
        netRevenue,
        currency,
        hasPendingPayout,
        hasCompletedPayout,
        payoutEligible,
        payoutMethod: haitiProfile?.method,
        bankInfo,
      }
    }

    // Process events with bounded concurrency. This is dramatically faster than the
    // previous sequential loop while avoiding overwhelming Firestore with 500+ events
    // each issuing multiple reads at once.
    const results = await mapWithConcurrency(eventsSnapshot.docs, 12, processEvent)
    const disbursementInfo = results.filter(
      (info): info is EventDisbursementInfo => info !== null
    )

    return disbursementInfo.sort((a, b) => b.daysEnded - a.daysEnded)
  } catch (error) {
    console.error('Error fetching ended events:', error)
    return []
  }
}

/**
 * Get summary statistics for disbursements
 */
export async function getDisbursementStats() {
  try {
    const now = new Date()

    // Events ended in last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [recentEndedSnapshot, pendingPayoutsSnapshot, approvedPayoutsSnapshot] = await Promise.all([
      adminDb
        .collection('events')
        .where('end_datetime', '<=', now)
        .where('end_datetime', '>=', sevenDaysAgo)
        .get(),
      // Pending payouts
      adminDb
        .collectionGroup('payouts')
        .where('status', '==', 'pending')
        .get(),
      // Approved payouts
      adminDb
        .collectionGroup('payouts')
        .where('status', '==', 'approved')
        .get(),
    ])

    // Calculate total pending amount
    let totalPendingAmount = 0
    pendingPayoutsSnapshot.docs.forEach((doc: any) => {
      totalPendingAmount += doc.data().amount || 0
    })

    return {
      eventsEndedLast7Days: recentEndedSnapshot.size,
      pendingPayouts: pendingPayoutsSnapshot.size,
      approvedPayouts: approvedPayoutsSnapshot.size,
      totalPendingAmount
    }
  } catch (error) {
    console.error('Error fetching disbursement stats:', error)
    return {
      eventsEndedLast7Days: 0,
      pendingPayouts: 0,
      approvedPayouts: 0,
      totalPendingAmount: 0
    }
  }
}
