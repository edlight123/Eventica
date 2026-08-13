import 'server-only'

import { adminDb } from '@/lib/firebase/admin'
import { normalizeDeclaredMarkets } from '@/lib/organizer-markets'

/**
 * Declared markets live on the ORGANIZER record — organizers/{uid} — next to the
 * payoutProfiles subcollection they inform, not on the users doc (which carries
 * the attendee-facing `default_country` used for discovery). Two different
 * questions: "where are you?" vs "where will you run events?".
 *
 * Shape:
 *   organizers/{organizerId}.event_markets            string[]  ISO codes, declaration order
 *   organizers/{organizerId}.event_markets_updated_at ISO string
 *
 * Absent field / empty array = UNDECLARED. Callers must treat that as "show
 * everything", never as "allow nothing" — see lib/organizer-markets.ts.
 */
export const DECLARED_MARKETS_FIELD = 'event_markets'

export async function getDeclaredMarkets(organizerId: unknown): Promise<string[]> {
  const id = String(organizerId || '').trim()
  if (!id) return []

  try {
    const snap = await adminDb.collection('organizers').doc(id).get()
    if (!snap.exists) return []
    const data = snap.data() as any
    return normalizeDeclaredMarkets(data?.[DECLARED_MARKETS_FIELD])
  } catch (error) {
    // A read failure must degrade to "undeclared" (show every rail), never to a
    // narrowed UI that hides the rail an organizer actually needs.
    console.error('Error loading declared markets:', error)
    return []
  }
}

/**
 * Replace the declaration. Passing an empty list is legitimate: it clears the
 * declaration and puts the organizer back to seeing every rail.
 */
export async function setDeclaredMarkets(
  organizerId: unknown,
  markets: unknown
): Promise<string[]> {
  const id = String(organizerId || '').trim()
  if (!id) throw new Error('Missing organizer id')

  const normalized = normalizeDeclaredMarkets(markets)

  await adminDb
    .collection('organizers')
    .doc(id)
    .set(
      {
        [DECLARED_MARKETS_FIELD]: normalized,
        event_markets_updated_at: new Date().toISOString(),
      },
      { merge: true }
    )

  return normalized
}
