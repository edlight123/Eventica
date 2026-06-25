// Webhook idempotency helpers.
//
// Payment providers (Stripe, etc.) deliver webhooks AT LEAST once: the same event
// can arrive multiple times (provider retries, network hiccups, our own non-2xx
// responses). Without a guard, a redelivered "payment succeeded" event would create
// a second set of tickets, double-count earnings, and double-increment inventory.
//
// We dedupe on the provider's stable event id using a Firestore transaction so that
// only ONE delivery ever does the work, even if two arrive concurrently.

import { adminDb } from '@/lib/firebase/admin'

export type WebhookClaim =
  | { outcome: 'claimed' }
  | { outcome: 'already_processed' }
  | { outcome: 'in_progress' }

// If a claim has been "processing" longer than this, assume the previous attempt
// crashed mid-way and allow a retry to re-claim it.
const DEFAULT_STALE_MS = 120_000

const COLLECTION = 'webhook_events'

function docId(provider: string, eventId: string): string {
  // Keep it filesystem/document-id safe and collision-free across providers.
  const safe = `${provider}__${eventId}`.replace(/[^A-Za-z0-9_.-]/g, '_')
  return safe.slice(0, 1500)
}

function isAdminDbAvailable(): boolean {
  return Boolean(adminDb && typeof (adminDb as any).collection === 'function')
}

/**
 * Atomically claim a webhook event for processing.
 *
 * Returns:
 *  - `claimed`           -> caller owns processing; do the work, then call markWebhookEventCompleted.
 *  - `already_processed` -> a previous delivery finished; caller should no-op and return 2xx.
 *  - `in_progress`       -> another delivery is actively processing; caller should no-op and return 2xx.
 *
 * Fails OPEN (returns `claimed`) if Firestore is unavailable, so a transient infra
 * issue never blocks a legitimate payment from being fulfilled. The downstream
 * fulfillment paths have their own per-order guards (e.g. MonCash claim, and for
 * Stripe the rarity of concurrent infra failure) to limit duplication risk.
 */
export async function claimWebhookEvent(params: {
  provider: string
  eventId: string
  staleMs?: number
  eventType?: string
}): Promise<WebhookClaim> {
  const { provider, eventId } = params
  const staleMs = params.staleMs ?? DEFAULT_STALE_MS

  if (!provider || !eventId) {
    // Without a stable id we can't dedupe; let the caller proceed.
    return { outcome: 'claimed' }
  }

  if (!isAdminDbAvailable()) {
    return { outcome: 'claimed' }
  }

  const ref = adminDb.collection(COLLECTION).doc(docId(provider, eventId))

  try {
    return await adminDb.runTransaction(async (tx: any) => {
      const doc = await tx.get(ref)

      if (doc.exists) {
        const data = doc.data() || {}
        if (data.status === 'completed') {
          return { outcome: 'already_processed' } as WebhookClaim
        }
        if (data.status === 'processing' && data.started_at) {
          const startedAt = new Date(data.started_at).getTime()
          if (Number.isFinite(startedAt) && Date.now() - startedAt < staleMs) {
            return { outcome: 'in_progress' } as WebhookClaim
          }
        }
      }

      tx.set(
        ref,
        {
          provider,
          event_id: eventId,
          event_type: params.eventType || null,
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      )
      return { outcome: 'claimed' } as WebhookClaim
    })
  } catch (err) {
    console.error('[webhook_idempotency] claim failed; proceeding without dedupe', {
      provider,
      eventId,
      message: (err as any)?.message,
    })
    return { outcome: 'claimed' }
  }
}

/** Mark a previously-claimed event as fully processed so future deliveries no-op. */
export async function markWebhookEventCompleted(params: {
  provider: string
  eventId: string
  metadata?: Record<string, any>
}): Promise<void> {
  const { provider, eventId } = params
  if (!provider || !eventId || !isAdminDbAvailable()) return

  try {
    await adminDb
      .collection(COLLECTION)
      .doc(docId(provider, eventId))
      .set(
        {
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(params.metadata ? { metadata: params.metadata } : {}),
        },
        { merge: true }
      )
  } catch (err) {
    console.error('[webhook_idempotency] failed to mark completed', {
      provider,
      eventId,
      message: (err as any)?.message,
    })
  }
}

/**
 * Release a claim so the provider's next retry can re-process the event.
 * Call this when processing throws AFTER a successful claim.
 */
export async function releaseWebhookEvent(params: {
  provider: string
  eventId: string
}): Promise<void> {
  const { provider, eventId } = params
  if (!provider || !eventId || !isAdminDbAvailable()) return

  try {
    await adminDb
      .collection(COLLECTION)
      .doc(docId(provider, eventId))
      .set(
        { status: 'failed', started_at: null, updated_at: new Date().toISOString() },
        { merge: true }
      )
  } catch (err) {
    console.error('[webhook_idempotency] failed to release claim', {
      provider,
      eventId,
      message: (err as any)?.message,
    })
  }
}
