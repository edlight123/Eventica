import { 
  formatCurrency, 
  convertCurrency, 
  getExchangeRate,
  fetchStripeHTGRate,
  CURRENCIES 
} from '@/lib/currency'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Currency Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100.00')
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56')
      expect(formatCurrency(0.99, 'USD')).toBe('$0.99')
    })

    it('should format HTG correctly', () => {
      expect(formatCurrency(100, 'HTG')).toBe('G100.00')
      expect(formatCurrency(1234.56, 'HTG')).toBe('G1,234.56')
      expect(formatCurrency(13158, 'HTG')).toBe('G13,158.00')
    })

    it('should default to USD when no currency specified', () => {
      expect(formatCurrency(50)).toBe('$50.00')
    })

    // Regression: the admin Orders page crashed with
    // "Cannot read properties of undefined (reading 'decimals')" when an order
    // carried a missing / lowercase / unexpected currency.
    it('should not crash on an invalid or missing currency (falls back to USD)', () => {
      expect(() => formatCurrency(100, undefined as any)).not.toThrow()
      expect(() => formatCurrency(100, null as any)).not.toThrow()
      expect(() => formatCurrency(100, '' as any)).not.toThrow()
      expect(() => formatCurrency(100, 'EUR' as any)).not.toThrow()
      expect(formatCurrency(100, null as any)).toBe('$100.00')
      // EUR is supported (France is a live market), so it formats as EUR.
      expect(formatCurrency(100, 'EUR' as any)).toBe('€100.00')
      // An unknown code is what should fall back to USD.
      expect(formatCurrency(100, 'XYZ' as any)).toBe('$100.00')
    })

    it('should accept lowercase currency codes', () => {
      expect(formatCurrency(100, 'usd' as any)).toBe('$100.00')
      expect(formatCurrency(100, 'htg' as any)).toBe('G100.00')
    })

    it('should coerce non-finite amounts to 0', () => {
      expect(formatCurrency(NaN as any, 'USD')).toBe('$0.00')
      expect(formatCurrency(undefined as any, 'USD')).toBe('$0.00')
      expect(formatCurrency(Infinity as any, 'USD')).toBe('$0.00')
    })
  })

  describe('convertCurrency', () => {
    it('should convert HTG to USD', () => {
      const result = convertCurrency(1000, 'HTG', 'USD')
      expect(result).toBeCloseTo(7.6, 2) // 1000 * 0.0076
    })

    it('should convert USD to HTG', () => {
      const result = convertCurrency(100, 'USD', 'HTG')
      expect(result).toBeCloseTo(13158, 0) // 100 * 131.58
    })

    it('should return same amount when currencies are the same', () => {
      expect(convertCurrency(100, 'USD', 'USD')).toBe(100)
      expect(convertCurrency(1000, 'HTG', 'HTG')).toBe(1000)
    })
  })

  describe('getExchangeRate', () => {
    it('should return 1 for same currency', () => {
      expect(getExchangeRate('USD', 'USD')).toBe(1)
      expect(getExchangeRate('HTG', 'HTG')).toBe(1)
    })

    it('should return correct HTG to USD rate', () => {
      const rate = getExchangeRate('HTG', 'USD')
      expect(rate).toBe(0.0076)
    })

    it('should return correct USD to HTG rate', () => {
      const rate = getExchangeRate('USD', 'HTG')
      expect(rate).toBe(131.58)
    })
  })

  describe('fetchStripeHTGRate - Multi-source Fallback', () => {
    it('should use Stripe API rate when available', async () => {
      const mockStripeRate = 0.0078
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            usd: mockStripeRate
          }
        })
      })

      const rate = await fetchStripeHTGRate()
      
      expect(rate).toBe(mockStripeRate)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/exchange_rates/HTG',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk_test_123'
          })
        })
      )
    })

    it('should fallback to ExchangeRate-API when Stripe fails', async () => {
      const mockExchangeRate = 0.0077
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      
      // Stripe fails
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      })
      
      // ExchangeRate-API succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            USD: mockExchangeRate
          }
        })
      })

      const rate = await fetchStripeHTGRate()
      
      expect(rate).toBe(mockExchangeRate)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/HTG',
        expect.objectContaining({
          headers: { 'Accept': 'application/json' }
        })
      )
    })

    it('should fallback to OpenExchangeRates when configured and previous sources fail', async () => {
      const mockOpenExchangeRate = 130.5 // USD to HTG
      const expectedHTGToUSD = 1 / mockOpenExchangeRate
      
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.OPEN_EXCHANGE_RATES_API_KEY = 'test_api_key'
      
      // Stripe fails
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
      
      // ExchangeRate-API fails
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
      
      // OpenExchangeRates succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            HTG: mockOpenExchangeRate
          }
        })
      })

      const rate = await fetchStripeHTGRate()
      
      expect(rate).toBeCloseTo(expectedHTGToUSD, 6)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('openexchangerates.org'),
        expect.any(Object)
      )
    })

    it('should use hardcoded fallback when all APIs fail', async () => {
      const hardcodedRate = 0.0076
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      
      // All APIs fail
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const rate = await fetchStripeHTGRate()
      
      expect(rate).toBe(hardcodedRate)
    })

    it('should handle missing Stripe key gracefully', async () => {
      const mockExchangeRate = 0.0075
      delete process.env.STRIPE_SECRET_KEY
      
      // ExchangeRate-API succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: {
            USD: mockExchangeRate
          }
        })
      })

      const rate = await fetchStripeHTGRate()
      
      expect(rate).toBe(mockExchangeRate)
      // Should skip Stripe and go directly to ExchangeRate-API
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('stripe.com'),
        expect.any(Object)
      )
    })

    it('should handle malformed API responses', async () => {
      const hardcodedRate = 0.0076
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      
      // Stripe returns malformed data
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: {} }) // Missing usd field
      })
      
      // ExchangeRate-API returns malformed data
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: null })
      })

      const rate = await fetchStripeHTGRate()
      
      expect(rate).toBe(hardcodedRate)
    })
  })

  describe('CURRENCIES Configuration', () => {
    it('should have correct USD configuration', () => {
      expect(CURRENCIES.USD).toEqual({
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        decimals: 2
      })
    })

    it('should have correct HTG configuration', () => {
      expect(CURRENCIES.HTG).toEqual({
        code: 'HTG',
        symbol: 'G',
        name: 'Haitian Gourde',
        decimals: 2
      })
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle typical event pricing in HTG', () => {
      const ticketPriceHTG = 500 // G500
      const priceUSD = convertCurrency(ticketPriceHTG, 'HTG', 'USD')
      
      expect(priceUSD).toBeCloseTo(3.8, 2) // ~$3.80
      expect(formatCurrency(priceUSD, 'USD')).toBe('$3.80')
    })

    it('should handle premium event pricing in HTG', () => {
      const ticketPriceHTG = 5000 // G5000
      const priceUSD = convertCurrency(ticketPriceHTG, 'HTG', 'USD')
      
      expect(priceUSD).toBeCloseTo(38, 2) // ~$38
      expect(formatCurrency(ticketPriceHTG, 'HTG')).toBe('G5,000.00')
    })

    it('should handle USD to HTG conversion for refunds', () => {
      const refundUSD = 25 // $25
      const refundHTG = convertCurrency(refundUSD, 'USD', 'HTG')
      
      expect(refundHTG).toBeCloseTo(3289.5, 1) // ~G3,289.50
      expect(formatCurrency(refundHTG, 'HTG')).toBe('G3,289.50')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero amounts', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00')
      expect(convertCurrency(0, 'HTG', 'USD')).toBe(0)
    })

    it('should handle very small amounts', () => {
      const smallAmount = 0.01
      expect(formatCurrency(smallAmount, 'USD')).toBe('$0.01')
      expect(convertCurrency(smallAmount, 'USD', 'HTG')).toBeCloseTo(1.32, 2)
    })

    it('should handle very large amounts', () => {
      const largeAmount = 1000000 // 1 million
      expect(formatCurrency(largeAmount, 'HTG')).toBe('G1,000,000.00')
      const convertedUSD = convertCurrency(largeAmount, 'HTG', 'USD')
      expect(convertedUSD).toBeCloseTo(7600, 0)
    })

    it('should handle negative amounts (refunds)', () => {
      expect(formatCurrency(-50, 'USD')).toBe('$-50.00')
      expect(convertCurrency(-100, 'HTG', 'USD')).toBeCloseTo(-0.76, 2)
    })
  })
})
