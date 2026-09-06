import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getLocationFromVercelHeaders } from '@/lib/geolocation'

/**
 * Where a user is, for the purpose of "there is an event near you".
 *
 * Derived from the IP that Vercel already resolves on every request — including
 * requests from the mobile app, which talks to this same backend. That means no
 * location permission prompt, no expo-location dependency, and no coordinates
 * stored anywhere: a city and country string is all a city-level notification
 * needs.
 *
 * Accuracy caveat worth remembering before trusting this for anything tighter
 * than a city: mobile carriers route through gateways, so a phone in Jacmel can
 * resolve to Port-au-Prince. It is a good default, not a position fix. Anything
 * needing real proximity would have to ask for location properly.
 */
export interface AudienceCity {
  city: string
  countryCode: string
  region: string
}

export function audienceCityFromHeaders(headers: Headers): AudienceCity | null {
  const geo = getLocationFromVercelHeaders(headers)
  if (!geo?.city || !geo.countryCode) return null
  return { city: geo.city, countryCode: geo.countryCode, region: geo.region || '' }
}

/**
 * Remember where this user last appeared from.
 *
 * Best-effort by design: this runs alongside things the user actually asked for
 * (registering a push token), and a geo write failing must never fail those.
 */
export async function rememberAudienceCity(
  userId: string,
  headers: Headers
): Promise<void> {
  const where = audienceCityFromHeaders(headers)
  if (!where) return

  try {
    await adminDb.collection('users').doc(userId).set(
      {
        last_seen_city: where.city,
        last_seen_country: where.countryCode,
        last_seen_region: where.region,
        last_seen_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  } catch (error) {
    console.error('[audience-city] could not store city for', userId, error)
  }
}

/** Normalize for comparison — "Port-au-Prince" and "port au prince" are one city. */
export function cityKey(city: string): string {
  return String(city || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function sameCity(a: string, b: string): boolean {
  const ka = cityKey(a)
  return ka.length > 0 && ka === cityKey(b)
}
