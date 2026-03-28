import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export type CheckInResult = 
  | { success: true; type: 'VALID'; attendeeName: string; ticketType: string; quantity: number; entryPoint: string }
  | { success: false; type: 'ALREADY_CHECKED_IN'; attendeeName: string; checkedInAt: string; entryPoint: string; allowReentry: boolean }
  | { success: false; type: 'INVALID'; reason: 'NOT_FOUND' | 'WRONG_EVENT' | 'REFUNDED' | 'CANCELLED' | 'PENDING_PAYMENT' }

export interface CheckInParams {
  ticketId: string
  eventId: string
  entryPoint: string
  scannedBy: string
}

/**
 * Perform transactional check-in for a ticket
 * Prevents duplicate check-ins through Firestore transaction
 */
export async function checkInTicket(params: CheckInParams): Promise<CheckInResult> {
  const { ticketId, eventId, entryPoint, scannedBy } = params

  try {
    const ticketRef = adminDb.collection('tickets').doc(ticketId)
    const eventRef = adminDb.collection('events').doc(eventId)

    // Run in transaction to prevent race conditions
    const result = await adminDb.runTransaction(async (transaction: any) => {
      const [ticketDoc, eventDoc] = await Promise.all([
        transaction.get(ticketRef),
        transaction.get(eventRef),
      ])
      const allowReentry = Boolean(eventDoc.exists && eventDoc.data()?.allow_reentry)

      // Check if ticket exists
      if (!ticketDoc.exists) {
        return {
          success: false,
          type: 'INVALID',
          reason: 'NOT_FOUND',
        } as CheckInResult
      }

      const ticketData = ticketDoc.data()!

      // Check if ticket belongs to this event
      if (ticketData.event_id !== eventId) {
        return {
          success: false,
          type: 'INVALID',
          reason: 'WRONG_EVENT',
        } as CheckInResult
      }

      // Check ticket status
      if (ticketData.status === 'refunded') {
        return {
          success: false,
          type: 'INVALID',
          reason: 'REFUNDED',
        } as CheckInResult
      }

      if (ticketData.status === 'cancelled') {
        return {
          success: false,
          type: 'INVALID',
          reason: 'CANCELLED',
        } as CheckInResult
      }

      if (ticketData.status === 'pending') {
        return {
          success: false,
          type: 'INVALID',
          reason: 'PENDING_PAYMENT',
        } as CheckInResult
      }

      // Check if already checked in
      if (ticketData.checked_in === true || ticketData.checked_in_at) {
        // Fetch attendee name for display
        let attendeeName = 'Guest'
        if (ticketData.attendee_id) {
          const userDoc = await adminDb.collection('users').doc(ticketData.attendee_id).get()
          if (userDoc.exists) {
            attendeeName = userDoc.data()?.full_name || userDoc.data()?.email || 'Guest'
          }
        }

        return {
          success: false,
          type: 'ALREADY_CHECKED_IN',
          attendeeName,
          checkedInAt: ticketData.checked_in_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          entryPoint: ticketData.entry_point || 'Unknown',
          allowReentry,
        } as CheckInResult
      }

      // Fetch attendee info
      let attendeeName = 'Guest'
      if (ticketData.attendee_id) {
        const userDoc = await adminDb.collection('users').doc(ticketData.attendee_id).get()
        if (userDoc.exists) {
          attendeeName = userDoc.data()?.full_name || userDoc.data()?.email || 'Guest'
        }
      }

      // Perform check-in - update ticket
      transaction.update(ticketRef, {
        checked_in: true,
        checked_in_at: FieldValue.serverTimestamp(),
        checked_in_by: scannedBy,
        entry_point: entryPoint,
        updated_at: FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        type: 'VALID',
        attendeeName,
        ticketType: ticketData.ticket_type || 'General Admission',
        quantity: ticketData.quantity || 1,
        entryPoint,
      } as CheckInResult
    })

    return result
  } catch (error) {
    console.error('Check-in transaction error:', error)
    return {
      success: false,
      type: 'INVALID',
      reason: 'NOT_FOUND',
    }
  }
}

/**
 * Override check-in for re-entry (admin only)
 */
export async function overrideCheckIn(params: CheckInParams): Promise<CheckInResult> {
  const { ticketId, eventId, entryPoint, scannedBy } = params

  try {
    const ticketRef = adminDb.collection('tickets').doc(ticketId)
    const ticketDoc = await ticketRef.get()

    if (!ticketDoc.exists) {
      return {
        success: false,
        type: 'INVALID',
        reason: 'NOT_FOUND',
      }
    }

    const ticketData = ticketDoc.data()!

    if (ticketData.event_id !== eventId) {
      return {
        success: false,
        type: 'INVALID',
        reason: 'WRONG_EVENT',
      }
    }

    // Fetch attendee info
    let attendeeName = 'Guest'
    if (ticketData.attendee_id) {
      const userDoc = await adminDb.collection('users').doc(ticketData.attendee_id).get()
      if (userDoc.exists) {
        attendeeName = userDoc.data()?.full_name || userDoc.data()?.email || 'Guest'
      }
    }

    // Update with override flag
    await ticketRef.update({
      checked_in: true,
      checked_in_at: FieldValue.serverTimestamp(),
      checked_in_by: scannedBy,
      entry_point: entryPoint,
      reentry_override: true,
      updated_at: FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      type: 'VALID',
      attendeeName,
      ticketType: ticketData.ticket_type || 'General Admission',
      quantity: ticketData.quantity || 1,
      entryPoint,
    }
  } catch (error) {
    console.error('Override check-in error:', error)
    return {
      success: false,
      type: 'INVALID',
      reason: 'NOT_FOUND',
    }
  }
}
