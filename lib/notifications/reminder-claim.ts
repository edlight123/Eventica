import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Idempotency for scheduled reminders.
 *
 * The reminder cron used to have no send-record at all: it relied on its query
 * window being narrower than the cron period, so a given event could only fall
 * inside a window on one run. That is dedupe by arithmetic, and it fails in both
 * directions — a window narrower than the period (the 30-minute reminder used a
 * 10-minute window against an hourly cron) silently SKIPS most events, while any
 * retry, overlap or schedule change double-sends to every ticket holder.
 *
 * A claim decouples the two: windows can be as wide as correctness wants, and a
 * reminder still goes out exactly once per (event, type).
 */
const COLLECTION = 'reminderClaims'

const claimId = (eventId: string, reminderType: string) => `${eventId}__${reminderType}`

/**
 * Try to take the right to send one reminder.
 *
 * Returns true for the caller that wins the claim, false for everyone after it.
 * A failure to reach Firestore returns FALSE — skipping a reminder is a smaller
 * harm than pushing the same one to every attendee of an event repeatedly.
 */
export async function claimReminder(
  eventId: string,
  reminderType: string
): Promise<boolean> {
  const ref = adminDb.collection(COLLECTION).doc(claimId(eventId, reminderType))

  try {
    return await adminDb.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref)
      if (snap.exists) return false

      tx.set(ref, {
        eventId,
        reminderType,
        claimedAt: FieldValue.serverTimestamp(),
      })
      return true
    })
  } catch (error) {
    console.error(`[reminder-claim] could not claim ${eventId}/${reminderType}:`, error)
    return false
  }
}

/**
 * Give the claim back when the send failed, so the next run can retry it.
 */
export async function releaseReminderClaim(
  eventId: string,
  reminderType: string
): Promise<void> {
  try {
    await adminDb.collection(COLLECTION).doc(claimId(eventId, reminderType)).delete()
  } catch (error) {
    console.error(`[reminder-claim] could not release ${eventId}/${reminderType}:`, error)
  }
}
