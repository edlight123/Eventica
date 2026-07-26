export type Currency = 'USD' | 'HTG' | 'CAD' | 'EUR'

export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  decimals: number
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2
  },
  HTG: {
    code: 'HTG',
    symbol: 'G',
    name: 'Haitian Gourde',
    decimals: 2
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    decimals: 2
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2
  }
}

// Exchange rates (HTG to USD)
// In production, fetch from an API like exchangerate-api.com
const EXCHANGE_RATES: Record<string, number> = {
  'HTG_TO_USD': 0.0076, // 1 HTG ≈ $0.0076 USD (as of 2025)
  'USD_TO_HTG': 131.58  // 1 USD ≈ 131.58 HTG
}

export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  // Be defensive: order/payment data may carry a missing, lowercase, or
  // unexpected currency. Normalize and fall back to USD so we never crash on
  // `config.decimals` (the default param only covers `undefined`).
  const key = String(currency || 'USD').toUpperCase() as Currency
  const config = CURRENCIES[key] ?? CURRENCIES.USD
  const safeAmount = Number.isFinite(amount) ? amount : 0

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  }).format(safeAmount)

  // Use the symbol as a prefix only. Appending the ISO code as well (e.g.
  // "G7,000.00 HTG" / "$100.00 USD") is redundant, so we drop it. Surrounding
  // UI already labels the currency context where needed.
  return `${config.symbol}${formatted}`
}

export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const rateKey = `${fromCurrency}_TO_${toCurrency}`
  const rate = EXCHANGE_RATES[rateKey]

  if (!rate) {
    throw new Error(`Exchange rate not found for ${rateKey}`)
  }

  return amount * rate
}

export function getExchangeRate(from: Currency, to: Currency): number {
  if (from === to) return 1
  
  const rateKey = `${from}_TO_${to}`
  return EXCHANGE_RATES[rateKey] || 1
}

// Get current exchange rates from API (for production)
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    // In production, use a real API like:
    // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    // const data = await response.json()
    // return data.rates
    
    return EXCHANGE_RATES
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    return EXCHANGE_RATES // Fallback to hardcoded rates
  }
}

/**
 * Fetch live HTG to USD exchange rate with multiple fallback sources
 * 
 * Tries in order:
 * 1. Stripe Exchange Rates API (if available)
 * 2. ExchangeRate-API.com (free, no auth required)
 * 3. Hardcoded fallback rate
 * 
 * @returns Promise<number> The current HTG to USD exchange rate
 */
export async function fetchStripeHTGRate(): Promise<number> {
  // Try 1: Stripe Exchange Rates API
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const response = await fetch('https://api.stripe.com/v1/exchange_rates/HTG', {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.rates && data.rates.usd) {
          console.log(`✅ Fetched live Stripe HTG→USD rate: ${data.rates.usd}`)
          return data.rates.usd
        }
      }
    }
  } catch (error) {
    console.log('ℹ️  Stripe exchange rate not available, trying alternative...')
  }

  // Try 2: ExchangeRate-API.com (free tier, no auth required)
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/HTG', {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.rates && data.rates.USD) {
        console.log(`✅ Fetched live ExchangeRate-API HTG→USD rate: ${data.rates.USD}`)
        return data.rates.USD
      }
    }
  } catch (error) {
    console.log('ℹ️  ExchangeRate-API not available, using hardcoded fallback')
  }

  // Try 3: Open Exchange Rates (if API key is configured)
  if (process.env.OPEN_EXCHANGE_RATES_API_KEY) {
    try {
      const response = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_RATES_API_KEY}&base=USD`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.rates && data.rates.HTG) {
          // Convert USD→HTG rate to HTG→USD
          const htgToUsd = 1 / data.rates.HTG
          console.log(`✅ Fetched live OpenExchangeRates HTG→USD rate: ${htgToUsd}`)
          return htgToUsd
        }
      }
    } catch (error) {
      console.log('ℹ️  OpenExchangeRates not available')
    }
  }

  // Fallback 4: Hardcoded rate
  console.log('⚠️  Using hardcoded fallback HTG→USD rate:', EXCHANGE_RATES.HTG_TO_USD)
  return EXCHANGE_RATES.HTG_TO_USD
}

/**
 * Fetch live USD→HTG exchange rate.
 *
 * Uses the same sources as `fetchStripeHTGRate()` (HTG→USD), then inverts.
 * Falls back to hardcoded USD_TO_HTG.
 */
export async function fetchUsdToHtgRate(): Promise<number> {
  try {
    const htgToUsd = await fetchStripeHTGRate()
    if (typeof htgToUsd === 'number' && Number.isFinite(htgToUsd) && htgToUsd > 0) {
      return 1 / htgToUsd
    }
  } catch {
    // ignore and fall back
  }

  const fallback = EXCHANGE_RATES.USD_TO_HTG
  return typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0 ? fallback : 131.58
}

// Parse currency from string (e.g., "$25.00 USD" -> { amount: 25, currency: 'USD' })
export function parseCurrency(str: string): { amount: number; currency: Currency } | null {
  const match = str.match(/([G$])?(\d+(?:\.\d+)?)\s*([A-Z]{3})?/)
  
  if (!match) return null

  const amount = parseFloat(match[2])
  let currency: Currency = 'USD'

  if (match[3] === 'HTG' || match[1] === 'G') {
    currency = 'HTG'
  }

  return { amount, currency }
}
