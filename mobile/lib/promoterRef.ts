// Promoter attribution (`?ref=CODE`) for links the app intercepts.
//
// Universal links mean a promoter's share link opens THIS app on any phone that
// has it installed — the web page's sessionStorage capture never runs. React
// Navigation delivers the query string as `route.params.ref`; this store keeps
// it per event so the ref survives re-navigation and an auth round trip, the
// way lib/pendingInvite.ts keeps staff invites.
//
// Same semantics as the web capture (BuyTicketButton): last click wins, junk is
// dropped locally and validated again server-side, and attribution must never
// block a purchase — every function here swallows storage failures.

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_PREFIX = '@Tikem:promoterRef:'

// The web capture is session-scoped; AsyncStorage is forever, so expire instead.
const TTL_MS = 48 * 60 * 60 * 1000

// Mirrors PROMOTER_CODE_PATTERN in lib/promoters.ts.
const CODE_PATTERN = /^[A-Z0-9_-]{2,24}$/

export function normalizeRefCode(raw: unknown): string | null {
  const code = String(raw ?? '').trim().toUpperCase()
  if (!code || !CODE_PATTERN.test(code)) return null
  return code
}

export async function setPromoterRef(eventId: string, rawCode: unknown): Promise<string | null> {
  const code = normalizeRefCode(rawCode)
  if (!code || !eventId) return null
  try {
    await AsyncStorage.setItem(`${KEY_PREFIX}${eventId}`, JSON.stringify({ code, at: Date.now() }))
  } catch {
    // Storage unavailable — attribution stays best-effort for this session only.
  }
  return code
}

export async function getPromoterRef(eventId: string): Promise<string | null> {
  if (!eventId) return null
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${eventId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const code = normalizeRefCode(parsed?.code)
    const at = Number(parsed?.at)
    if (!code || !Number.isFinite(at) || Date.now() - at > TTL_MS) {
      await AsyncStorage.removeItem(`${KEY_PREFIX}${eventId}`)
      return null
    }
    return code
  } catch {
    return null
  }
}
