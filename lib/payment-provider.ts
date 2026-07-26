import { providerForCountry } from '@/lib/country-support'

export type PaymentProvider = 'sogepay' | 'stripe_connect' | 'stripe'

export function normalizeCountryCode(raw: unknown): string {
  const value = String(raw || '').trim()
  if (!value) return ''

  const upper = value.toUpperCase()
  if (upper === 'HT' || upper === 'HAITI') return 'HT'
  if (upper === 'US' || upper === 'USA' || upper === 'UNITED STATES' || upper === 'UNITED_STATES') return 'US'
  if (upper === 'CA' || upper === 'CAN' || upper === 'CANADA') return 'CA'
  if (upper === 'FR' || upper === 'FRA' || upper === 'FRANCE') return 'FR'

  return upper
}

export function getPaymentProviderForEventCountry(country: unknown): PaymentProvider {
  const code = normalizeCountryCode(country)
  // Haiti uses Sogepay for card checkout (country-support models the payout rail
  // as MonCash; the card entry point is Sogepay).
  if (code === 'HT') return 'sogepay'
  // Every Stripe Connect market (US/CA/FR) resolves to destination charges.
  // Delegate the decision to the single source of truth so new Connect
  // countries don't need to be re-listed here.
  if (providerForCountry(code) === 'stripe_connect') return 'stripe_connect'
  return 'stripe'
}
