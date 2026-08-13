/**
 * Declared markets — the countries an organizer SAYS they intend to run events
 * in. Purely a UI hint. Keep this module free of framework/server imports so it
 * is safe in a route handler, a server component and the browser alike, and keep
 * it in lockstep with mobile/lib/organizerMarkets.ts.
 *
 * WHY THIS EXISTS
 * Nothing used to ask. The payout screens therefore showed every rail to
 * everyone: a Port-au-Prince organizer who will never touch a US bank was
 * offered Stripe Connect next to MonCash, and a diaspora organizer running both
 * sides had no signal that these are TWO separate setups, not alternatives.
 *
 * WHAT IT IS NOT
 * It is NOT an authorisation gate. The payout profile an event actually needs is
 * decided server-side from the EVENT's country
 * (getRequiredPayoutProfileIdForEventCountry), because that is what the money
 * follows. Declaring "Haiti only" hides the Stripe card; it does not stop the
 * server from requiring Stripe Connect the moment that organizer creates a US
 * event, and it never blocks anyone from adding a rail by hand. An answer given
 * in month one must never lock a diaspora organizer out of a market in month
 * six — hence: declarations are editable at any time, and an EMPTY declaration
 * means "show everything", never "allow nothing".
 */

import {
  COUNTRY_SUPPORT,
  countrySupport,
  normalizeSupportedCountry,
  type RequiredPayoutProfile,
} from './country-support'

/** Payout rail an organizer can be set up on. Mirrors PayoutProfileId. */
export type PayoutRailId = RequiredPayoutProfile

/** Countries an organizer may declare, in the order they are offered. */
export const DECLARABLE_MARKETS: string[] = Object.values(COUNTRY_SUPPORT)
  .filter((c) => c.selectable)
  .map((c) => c.code)

/**
 * Clean anything stored/submitted into a canonical, deduped, order-preserving
 * list of supported country codes. Unknown values are dropped rather than
 * guessed at — a bad code must never become a market an organizer didn't pick.
 */
export function normalizeDeclaredMarkets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  const out: string[] = []
  for (const value of raw) {
    const code = normalizeSupportedCountry(value)
    if (!code) continue
    if (!COUNTRY_SUPPORT[code]?.selectable) continue
    if (out.includes(code)) continue
    out.push(code)
  }
  return out
}

/** Display name for a market code (falls back to the code itself). */
export function marketName(code: unknown): string {
  return countrySupport(code)?.name ?? String(code ?? '')
}

/** Human list of market names, e.g. "Haiti, United States". */
export function marketNames(markets: string[]): string[] {
  return normalizeDeclaredMarkets(markets).map(marketName)
}

/**
 * The payout rails these markets imply, in declaration order. Coming-soon
 * markets (no rail yet) contribute nothing.
 */
export function railsForMarkets(markets: unknown): PayoutRailId[] {
  const rails: PayoutRailId[] = []
  for (const code of normalizeDeclaredMarkets(markets)) {
    const rail = countrySupport(code)?.requiredProfile
    if (rail && !rails.includes(rail)) rails.push(rail)
  }
  return rails
}

/**
 * Should this payout rail be SHOWN? UI hint only — see the module header.
 * No declaration (or a declaration that resolves to nothing) shows every rail,
 * which is the pre-existing behaviour and the safe direction to fail in.
 */
export function shouldShowRail(rail: PayoutRailId, markets: unknown): boolean {
  const rails = railsForMarkets(markets)
  if (rails.length === 0) return true
  return rails.includes(rail)
}

/** The declared markets served by a given rail, e.g. stripe_connect → US, CA. */
export function marketsForRail(rail: PayoutRailId, markets: unknown): string[] {
  return normalizeDeclaredMarkets(markets).filter(
    (code) => countrySupport(code)?.requiredProfile === rail
  )
}

/**
 * Markets that are declared but whose rail isn't set up yet — the "you told us
 * you'd run events here, and nothing can pay you there" list.
 */
export function marketsMissingSetup(
  markets: unknown,
  configured: Partial<Record<PayoutRailId, boolean>>
): string[] {
  return normalizeDeclaredMarkets(markets).filter((code) => {
    const rail = countrySupport(code)?.requiredProfile
    if (!rail) return false
    return configured[rail] !== true
  })
}

/**
 * Order a list of country codes so declared markets lead, preserving the
 * organizer's declaration order, then a fallback preference (their stated
 * default country / device region), then everything else untouched.
 */
export function orderCountriesByMarkets<T extends { code: string }>(
  countries: T[],
  markets: unknown,
  fallbackCountry?: unknown
): T[] {
  const declared = normalizeDeclaredMarkets(markets)
  const fallback = normalizeSupportedCountry(fallbackCountry)

  const rank = (code: string): number => {
    const declaredIndex = declared.indexOf(String(code).toUpperCase())
    if (declaredIndex >= 0) return declaredIndex
    if (fallback && String(code).toUpperCase() === fallback) return declared.length
    return declared.length + 1
  }

  // Stable sort: equal ranks keep their original relative order.
  return countries
    .map((country, index) => ({ country, index, rank: rank(country.code) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.country)
}
