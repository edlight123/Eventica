/**
 * The Expo app duplicates the fee model, because it is a separate bundle and
 * cannot import the web's `lib/checkout/buyer-pricing.ts`. Duplicated money logic
 * drifts — one side gets a new rate or a cap and the other quietly keeps charging
 * the old one, and the symptom is a price on a card that does not match the price
 * on the payment sheet.
 *
 * So this suite asserts the two implementations agree, to the cent, across the
 * cases that actually differ: both fee models, both markets, the per-ticket cap,
 * multi-ticket orders, and the organizer's own override.
 *
 * If this fails, do not "fix" the test — reconcile mobile/lib/buyerPricing.ts with
 * lib/fees.ts + types/platform-settings.ts, which are the source of truth.
 */

import { priceOrder as webPriceOrder } from '@/lib/checkout/buyer-pricing'
import {
  setPlatformFeeConfig,
  resetPlatformFeeConfig,
} from '@/lib/checkout/fee-config-store'
import {
  priceOrder as mobilePriceOrder,
  advertisedPrice as mobileAdvertisedPrice,
  incidenceForEvent as mobileIncidence,
  setFeeConfig as mobileSetFeeConfig,
  resetFeeConfig as mobileResetFeeConfig,
} from '../mobile/lib/buyerPricing'

type Case = {
  label: string
  face: number
  event: { country?: string | null; currency?: string | null; fee_incidence?: string | null }
  quantity: number
}

const CASES: Case[] = [
  { label: 'US $20 single', face: 20, event: { country: 'US', currency: 'USD' }, quantity: 1 },
  { label: 'US $50 at the cap', face: 50, event: { country: 'US', currency: 'USD' }, quantity: 1 },
  { label: 'US $100 over the cap', face: 100, event: { country: 'US', currency: 'USD' }, quantity: 1 },
  { label: 'US $200 well over', face: 200, event: { country: 'US', currency: 'USD' }, quantity: 1 },
  {
    label: 'US 4 × $100 — cap scales per ticket',
    face: 400,
    event: { country: 'US', currency: 'USD' },
    quantity: 4,
  },
  { label: 'Canada C$40', face: 40, event: { country: 'CA', currency: 'CAD' }, quantity: 1 },
  { label: 'France €30', face: 30, event: { country: 'FR', currency: 'EUR' }, quantity: 1 },
  { label: 'Haiti 1,000 HTG absorbed', face: 1_000, event: { country: 'HT', currency: 'HTG' }, quantity: 1 },
  {
    label: 'Haiti 10,000 HTG passed on, over the cap',
    face: 10_000,
    event: { country: 'HT', currency: 'HTG', fee_incidence: 'buyer' },
    quantity: 1,
  },
  {
    label: 'US event the organizer chose to absorb',
    face: 60,
    event: { country: 'US', currency: 'USD', fee_incidence: 'organizer' },
    quantity: 2,
  },
  { label: 'unknown country', face: 25, event: { country: 'ZZ', currency: 'USD' }, quantity: 1 },
  { label: 'free order', face: 0, event: { country: 'US', currency: 'USD' }, quantity: 1 },
]

describe('mobile and web price an order identically', () => {
  it.each(CASES)('$label', ({ face, event, quantity }) => {
    const web = webPriceOrder(face, event, { quantity, currency: event.currency })
    const mobile = mobilePriceOrder(face, event, { quantity })

    expect(mobile.incidence).toBe(web.incidence)
    expect(mobile.feeOnTop).toBe(web.feeOnTop)
    expect(mobile.faceValue).toBeCloseTo(web.faceValue, 2)
    expect(mobile.buyerFee).toBeCloseTo(web.buyerFee, 2)
    expect(mobile.total).toBeCloseTo(web.total, 2)
  })
})

describe('mobile advertised price', () => {
  it('is the single-ticket all-in total', () => {
    const event = { country: 'US', currency: 'USD' }
    expect(mobileAdvertisedPrice(20, event)).toBeCloseTo(
      webPriceOrder(20, event, { quantity: 1, currency: 'USD' }).total,
      2
    )
  })

  it('leaves a Haitian price untouched', () => {
    expect(mobileAdvertisedPrice(1_500, { country: 'HT', currency: 'HTG' })).toBe(1_500)
  })
})

describe('both sides adopt a changed config identically', () => {
  // The rate and cap are admin-editable. Web is seeded by FeeConfigProvider,
  // mobile by refreshFeeConfig from /api/platform/fee-config — two different
  // paths to the same numbers, which is exactly where they could diverge.
  const CHANGED = {
    haiti: { platformFeePercentage: 0.08, platformFeeCapMinorByCurrency: { HTG: 50_000 } },
    usCanada: { platformFeePercentage: 0.06, platformFeeCapMinorByCurrency: { USD: 300 } },
  }

  beforeEach(() => {
    setPlatformFeeConfig({
      haiti: { settlementHoldDays: 0, ...CHANGED.haiti },
      usCanada: { settlementHoldDays: 7, ...CHANGED.usCanada },
    })
    mobileSetFeeConfig(CHANGED)
  })

  afterEach(() => {
    resetPlatformFeeConfig()
    mobileResetFeeConfig()
  })

  it.each([
    { label: 'US $20 under the lowered cap', face: 20, event: { country: 'US', currency: 'USD' }, quantity: 1 },
    { label: 'US $100 over the lowered cap', face: 100, event: { country: 'US', currency: 'USD' }, quantity: 1 },
    { label: 'US 3 × $80', face: 240, event: { country: 'US', currency: 'USD' }, quantity: 3 },
    {
      label: 'Haiti 20,000 HTG passed on',
      face: 20_000,
      event: { country: 'HT', currency: 'HTG', fee_incidence: 'buyer' },
      quantity: 1,
    },
  ])('$label', ({ face, event, quantity }) => {
    const web = webPriceOrder(face, event, { quantity, currency: event.currency })
    const mobile = mobilePriceOrder(face, event, { quantity })
    expect(mobile.total).toBeCloseTo(web.total, 2)
    expect(mobile.buyerFee).toBeCloseTo(web.buyerFee, 2)
  })

  it('actually changed the price — otherwise this suite proves nothing', () => {
    const event = { country: 'US', currency: 'USD' }
    const seeded = mobilePriceOrder(100, event, { quantity: 1 }).total
    mobileResetFeeConfig()
    const shipped = mobilePriceOrder(100, event, { quantity: 1 }).total
    expect(seeded).not.toBeCloseTo(shipped, 2)
  })
})

describe('mobile incidence resolution', () => {
  it('matches the web rules, including the organizer override', () => {
    expect(mobileIncidence({ country: 'US' })).toBe('buyer')
    expect(mobileIncidence({ country: 'HT' })).toBe('organizer')
    expect(mobileIncidence({ country: 'ZZ' })).toBe('organizer')
    expect(mobileIncidence({ country: null })).toBe('organizer')
    expect(mobileIncidence({ country: 'HT', fee_incidence: 'buyer' })).toBe('buyer')
    expect(mobileIncidence({ country: 'US', fee_incidence: 'organizer' })).toBe('organizer')
    expect(mobileIncidence({ country: 'US', fee_incidence: 'nonsense' })).toBe('buyer')
  })
})
