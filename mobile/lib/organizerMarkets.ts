/**
 * Declared markets — the countries an organizer SAYS they intend to run events
 * in. Mobile mirror of the web lib/organizer-markets.ts; keep the two in
 * lockstep.
 *
 * A UI HINT, never an authorisation gate. It decides which payout rails the
 * settings screen offers and how the country chips in event creation are
 * ordered. The payout profile an event actually requires is still resolved
 * server-side from the EVENT's country (getRequiredPayoutProfileIdForEventCountry,
 * enforced at publish and at withdrawal) — that is what the money follows.
 *
 * Two rules keep this from becoming a trap:
 *   - an EMPTY declaration means "show everything", never "allow nothing";
 *   - it is re-editable at any time, because diaspora organizers add markets
 *     over time and must never be locked out by a month-one answer.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { backendFetch } from './api/backend';
import {
  COUNTRY_SUPPORT,
  countrySupport,
  normalizeSupportedCountry,
  type RequiredPayoutProfile,
} from './countrySupport';

export type PayoutRailId = RequiredPayoutProfile;

/** Countries an organizer may declare, in the order they are offered. */
export const DECLARABLE_MARKETS: string[] = Object.values(COUNTRY_SUPPORT)
  .filter((c) => c.selectable)
  .map((c) => c.code);

export function normalizeDeclaredMarkets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const out: string[] = [];
  for (const value of raw) {
    const code = normalizeSupportedCountry(value);
    if (!code) continue;
    if (!COUNTRY_SUPPORT[code]?.selectable) continue;
    if (out.includes(code)) continue;
    out.push(code);
  }
  return out;
}

/** The payout rails these markets imply, in declaration order. */
export function railsForMarkets(markets: unknown): PayoutRailId[] {
  const rails: PayoutRailId[] = [];
  for (const code of normalizeDeclaredMarkets(markets)) {
    const rail = countrySupport(code)?.requiredProfile;
    if (rail && !rails.includes(rail)) rails.push(rail);
  }
  return rails;
}

/** Should this rail be SHOWN? Undeclared → show everything. */
export function shouldShowRail(rail: PayoutRailId, markets: unknown): boolean {
  const rails = railsForMarkets(markets);
  if (rails.length === 0) return true;
  return rails.includes(rail);
}

/** The declared markets served by a rail, e.g. stripe_connect → US, CA. */
export function marketsForRail(rail: PayoutRailId, markets: unknown): string[] {
  return normalizeDeclaredMarkets(markets).filter(
    (code) => countrySupport(code)?.requiredProfile === rail
  );
}

/**
 * Order country options so declared markets lead (in declaration order), then a
 * fallback preference (stated default_country / device region), then the rest
 * in their original order.
 */
export function orderCountriesByMarkets<T extends { code: string }>(
  countries: T[],
  markets: unknown,
  fallbackCountry?: unknown
): T[] {
  const declared = normalizeDeclaredMarkets(markets);
  const fallback = normalizeSupportedCountry(fallbackCountry);

  const rank = (code: string): number => {
    const declaredIndex = declared.indexOf(String(code).toUpperCase());
    if (declaredIndex >= 0) return declaredIndex;
    if (fallback && String(code).toUpperCase() === fallback) return declared.length;
    return declared.length + 1;
  };

  return countries
    .map((country, index) => ({ country, index, rank: rank(country.code) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.country);
}

// ── Loading / persistence ───────────────────────────────────────────────────
// Writes go through the web API (Admin SDK) so normalization lives in one
// place. Reads are cached per-user so the chips and rails paint instantly on
// open; the cache is a display accelerator only, never a source of truth.

const cacheKey = (uid: string) => `organizer_markets_${uid}`;

export async function fetchDeclaredMarkets(): Promise<string[]> {
  const res = await backendFetch('/api/organizer/markets');
  if (!res.ok) throw new Error('Failed to load markets');
  const data = await res.json();
  return normalizeDeclaredMarkets(data?.markets);
}

export async function saveDeclaredMarkets(markets: string[]): Promise<string[]> {
  const res = await backendFetch('/api/organizer/markets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markets: normalizeDeclaredMarkets(markets) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to save markets');
  return normalizeDeclaredMarkets(data?.markets ?? markets);
}

/**
 * Declared markets for the signed-in organizer, cache-first.
 *
 * `loaded` says whether we have a real answer yet. Callers that narrow their UI
 * MUST wait for it — narrowing off an empty pre-load value would flash the
 * wrong rails. Everything degrades to "undeclared" (show everything) on error.
 */
export function useDeclaredMarkets(uid?: string | null) {
  const [markets, setMarkets] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey(uid));
        if (cached && !cancelled) {
          setMarkets(normalizeDeclaredMarkets(JSON.parse(cached)));
          setLoaded(true);
        }
      } catch {
        // Cache miss is not an error.
      }

      try {
        const fresh = await fetchDeclaredMarkets();
        if (cancelled) return;
        setMarkets(fresh);
        AsyncStorage.setItem(cacheKey(uid), JSON.stringify(fresh)).catch(() => {});
      } catch {
        // Offline / signed-out: stay on whatever we have. An empty list means
        // "undeclared", which shows every rail — the safe direction.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const save = useCallback(
    async (next: string[]) => {
      setSaving(true);
      try {
        const saved = await saveDeclaredMarkets(next);
        setMarkets(saved);
        if (uid) AsyncStorage.setItem(cacheKey(uid), JSON.stringify(saved)).catch(() => {});
        return saved;
      } finally {
        setSaving(false);
      }
    },
    [uid]
  );

  return { markets, loaded, saving, save };
}
