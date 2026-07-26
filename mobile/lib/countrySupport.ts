/**
 * Country support — single source of truth for which markets Tikèm supports and
 * what each market is allowed to do RIGHT NOW (mobile mirror of the web
 * lib/country-support.ts; keep the two in lockstep).
 *
 * This is an ADDITIVE support layer that sits alongside the existing location /
 * currency config (types/filters.ts: COUNTRIES, CURRENCY_BY_COUNTRY). It does
 * NOT replace them — a later phase reconciles those. The one job of this module
 * is to answer, for a given country:
 *   - is it selectable in the product at all?             (`selectable`)
 *   - can an organizer create/publish a PAID event here?  (`allowsPaid`)
 *   - is it a "coming soon" market (browsable, free-only)? (`comingSoon`)
 *   - which payout provider / KYC profile backs paid here? (`provider` / `requiredProfile`)
 *
 * Contract (keep in lockstep with lib/country-support.ts on web):
 *   HT — paid allowed, MonCash (haiti payout profile).
 *   US — paid allowed, Stripe Connect.
 *   CA — paid allowed, Stripe Connect.
 *   FR — paid allowed, Stripe Connect. (Being wired in a separate phase; treated
 *        as ALLOWS PAID here — do NOT gate FR.)
 *   DO — Dominican Republic: COMING SOON. Paid NOT allowed (free/RSVP only), but
 *        still selectable + browsable. No payout rail yet.
 */

export type PayoutProvider = 'moncash' | 'stripe_connect';
export type RequiredPayoutProfile = 'haiti' | 'stripe_connect';

export interface CountrySupport {
  code: string;
  name: string;
  /** Can this country be picked in location pickers / browsed in discovery. */
  selectable: boolean;
  /** Can an organizer create/publish a PAID (priced) event for this country. */
  allowsPaid: boolean;
  /** Browsable + selectable, but payouts aren't wired yet → free/RSVP only. */
  comingSoon: boolean;
  /** Payout rail backing paid events here, or null when paid isn't available. */
  provider: PayoutProvider | null;
  /** Payout profile / KYC an organizer needs before disbursement, or null. */
  requiredProfile: RequiredPayoutProfile | null;
  /** Currencies a PAID event may be priced in here (first = default). Empty for
   *  free-only / coming-soon markets. Also used for currency-aware price filters. */
  currencies: string[];
  /** Default/display currency for this market. */
  defaultCurrency: string;
}

export const COUNTRY_SUPPORT: Record<string, CountrySupport> = {
  HT: {
    code: 'HT',
    name: 'Haiti',
    selectable: true,
    allowsPaid: true,
    comingSoon: false,
    provider: 'moncash',
    requiredProfile: 'haiti',
    currencies: ['HTG', 'USD'],
    defaultCurrency: 'HTG',
  },
  US: {
    code: 'US',
    name: 'United States',
    selectable: true,
    allowsPaid: true,
    comingSoon: false,
    provider: 'stripe_connect',
    requiredProfile: 'stripe_connect',
    currencies: ['USD'],
    defaultCurrency: 'USD',
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    selectable: true,
    allowsPaid: true,
    comingSoon: false,
    provider: 'stripe_connect',
    requiredProfile: 'stripe_connect',
    currencies: ['CAD'],
    defaultCurrency: 'CAD',
  },
  FR: {
    code: 'FR',
    name: 'France',
    selectable: true,
    allowsPaid: true,
    comingSoon: false,
    provider: 'stripe_connect',
    requiredProfile: 'stripe_connect',
    currencies: ['EUR'],
    defaultCurrency: 'EUR',
  },
  DO: {
    code: 'DO',
    name: 'Dominican Republic',
    selectable: true,
    allowsPaid: false,
    comingSoon: true,
    provider: null,
    requiredProfile: null,
    currencies: [],
    defaultCurrency: 'USD',
  },
};

/**
 * Normalize any stored/input country value to one of our support codes
 * (HT/US/CA/FR/DO). Accepts ISO codes, common aliases, and full names in the
 * variants the product uses. Returns '' when it can't be resolved.
 */
export function normalizeSupportedCountry(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';

  const upper = value.toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (upper === 'HT' || upper === 'HTI' || upper === 'HAITI') return 'HT';
  if (upper === 'US' || upper === 'USA' || upper === 'UNITED STATES' || upper === 'UNITED STATES OF AMERICA') return 'US';
  if (upper === 'CA' || upper === 'CAN' || upper === 'CANADA') return 'CA';
  if (upper === 'FR' || upper === 'FRA' || upper === 'FRANCE') return 'FR';
  if (upper === 'DO' || upper === 'DR' || upper === 'DOM' || upper === 'DOMINICAN REPUBLIC') return 'DO';

  // Fall through: if it's already a bare 2-letter code we recognize, keep it.
  if (COUNTRY_SUPPORT[upper]) return upper;

  return '';
}

/** Full support record for a country, or undefined if unsupported. */
export function countrySupport(country: unknown): CountrySupport | undefined {
  const code = normalizeSupportedCountry(country);
  return code ? COUNTRY_SUPPORT[code] : undefined;
}

/**
 * Whether an organizer may create/publish a PAID event for this country.
 * Unknown/unsupported countries default to NOT allowed (fail closed).
 */
export function isPaidAllowed(country: unknown): boolean {
  return countrySupport(country)?.allowsPaid === true;
}

/** Whether this is a "coming soon" market (browsable, free/RSVP only). */
export function isComingSoon(country: unknown): boolean {
  return countrySupport(country)?.comingSoon === true;
}

/** Display name for a country code, falling back to the code itself. */
export function countryName(country: unknown): string {
  return countrySupport(country)?.name ?? String(country ?? '');
}

/** Payout provider backing paid events here ('moncash' | 'stripe_connect' | null). */
export function providerForCountry(country: unknown): PayoutProvider | null {
  return countrySupport(country)?.provider ?? null;
}

/** Currencies a paid event may use in this country (empty = free-only/unknown). */
export function currenciesForCountry(country: unknown): string[] {
  return countrySupport(country)?.currencies ?? [];
}

/** Default/display currency for this country (USD fallback for unknown). */
export function defaultCurrencyForCountry(country: unknown): string {
  return countrySupport(country)?.defaultCurrency ?? 'USD';
}

/** Whether a currency is allowed for a country's paid events. */
export function isCurrencyAllowed(country: unknown, currency: unknown): boolean {
  const cur = String(currency ?? '').toUpperCase();
  return currenciesForCountry(country).includes(cur);
}
