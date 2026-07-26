import { providerForCountry, countrySupport } from './countrySupport'

export type PaymentProvider = 'sogepay' | 'stripe_connect' | 'stripe'
export type PayoutProfileId = 'haiti' | 'stripe_connect'

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
  // Haiti uses Sogepay for card checkout.
  if (code === 'HT') return 'sogepay'
  // Every Stripe Connect market (US/CA/FR) resolves to destination charges.
  if (providerForCountry(code) === 'stripe_connect') return 'stripe_connect'
  return 'stripe'
}

export function getRequiredPayoutProfileIdForEventCountry(country: unknown): PayoutProfileId {
  // Any Stripe Connect market (US/CA/FR) requires the stripe_connect profile.
  if (countrySupport(country)?.requiredProfile === 'stripe_connect') return 'stripe_connect'
  return 'haiti'
}
