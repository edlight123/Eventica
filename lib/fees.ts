/**
 * Fee Calculation Utilities
 * 
 * Handles all fee calculations for the Tikèm payment system
 */

import { FEE_CONFIG, type FeeCalculation } from '@/types/earnings'

/**
 * Calculate platform fee (Tikèm's commission)
 * 
 * @param grossAmount - Total ticket sales in cents
 * @returns Platform fee in cents
 */
export function calculatePlatformFee(grossAmount: number): number {
  const feeAmount = Math.round(grossAmount * FEE_CONFIG.PLATFORM_FEE_PERCENTAGE)
  return Math.max(feeAmount, FEE_CONFIG.PLATFORM_FEE_MIN)
}

/**
 * Calculate platform fee with dynamic percentage based on location
 * 
 * @param grossAmount - Total ticket sales in cents
 * @param feePercentage - Dynamic fee percentage (e.g., 0.10 for 10%)
 * @returns Platform fee in cents
 */
export function calculatePlatformFeeWithPercentage(
  grossAmount: number,
  feePercentage: number
): number {
  const feeAmount = Math.round(grossAmount * feePercentage)
  return Math.max(feeAmount, FEE_CONFIG.PLATFORM_FEE_MIN)
}

/**
 * Calculate Stripe processing fee
 * Formula: 2.9% + $0.30 per transaction
 * 
 * @param grossAmount - Total amount charged in cents
 * @returns Processing fee in cents
 */
export function calculateStripeFee(grossAmount: number): number {
  const percentageFee = Math.round(grossAmount * FEE_CONFIG.STRIPE_FEE_PERCENTAGE)
  return percentageFee + FEE_CONFIG.STRIPE_FEE_FIXED
}

/**
 * Calculate all fees and net amount
 * 
 * @param grossAmount - Total ticket sales in cents
 * @returns Complete fee breakdown
 */
export function calculateFees(grossAmount: number): FeeCalculation {
  const platformFee = calculatePlatformFee(grossAmount)
  const processingFee = calculateStripeFee(grossAmount)
  const netAmount = grossAmount - platformFee - processingFee

  return {
    grossAmount,
    platformFee,
    processingFee,
    netAmount,
  }
}

/**
 * Calculate all fees and net amount with custom fee percentage
 * 
 * @param grossAmount - Total ticket sales in cents
 * @param feePercentage - Dynamic platform fee percentage
 * @returns Complete fee breakdown
 */
export function calculateFeesWithPercentage(
  grossAmount: number,
  feePercentage: number
): FeeCalculation {
  const platformFee = calculatePlatformFeeWithPercentage(grossAmount, feePercentage)
  const processingFee = calculateStripeFee(grossAmount)
  const netAmount = grossAmount - platformFee - processingFee

  return {
    grossAmount,
    platformFee,
    processingFee,
    netAmount,
  }
}

/**
 * Calculate what the organizer receives after all fees
 * 
 * @param ticketPrice - Price per ticket in cents
 * @param quantity - Number of tickets sold
 * @returns Net amount organizer receives
 */
export function calculateOrganizerEarnings(
  ticketPrice: number,
  quantity: number
): FeeCalculation {
  const grossAmount = ticketPrice * quantity
  return calculateFees(grossAmount)
}

/**
 * Format fee as percentage string
 * 
 * @param percentage - Fee percentage (e.g., 0.10 for 10%)
 * @returns Formatted string (e.g., "10%")
 */
export function formatFeePercentage(percentage: number): string {
  return `${(percentage * 100).toFixed(1)}%`
}

/**
 * Check if amount meets minimum payout threshold
 * 
 * @param amount - Amount in cents
 * @returns Whether amount is above minimum
 */
export function meetsMinimumPayout(amount: number): boolean {
  return amount >= FEE_CONFIG.MINIMUM_PAYOUT_AMOUNT
}

/**
 * Calculate settlement ready date
 * (Event end + configured hold period)
 * 
 * @param eventEndDate - Event end date/time
 * @returns Settlement ready date
 */
export function calculateSettlementDate(eventEndDate: Date): Date {
  const settlementDate = new Date(eventEndDate)
  settlementDate.setDate(settlementDate.getDate() + FEE_CONFIG.SETTLEMENT_HOLD_DAYS)
  return settlementDate
}

/**
 * Calculate settlement ready date with custom hold days
 * 
 * @param eventEndDate - Event end date/time
 * @param holdDays - Number of days to hold
 * @returns Settlement ready date
 */
export function calculateSettlementDateWithHoldDays(
  eventEndDate: Date,
  holdDays: number
): Date {
  const settlementDate = new Date(eventEndDate)
  settlementDate.setDate(settlementDate.getDate() + holdDays)
  return settlementDate
}

/**
 * Check if settlement period has passed
 * 
 * @param settlementReadyDate - ISO date string
 * @returns Whether funds are ready for withdrawal
 */
export function isSettlementReady(settlementReadyDate: string): boolean {
  return new Date() >= new Date(settlementReadyDate)
}

/**
 * Format currency amount
 * 
 * @param cents - Amount in cents
 * @param currency - Currency code
 * @returns Formatted string
 */
export function formatCurrency(cents: number, currency: 'HTG' | 'USD' | 'CAD' | 'EUR' = 'HTG'): string {
  const amount = (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (currency === 'HTG') return `HTG ${amount}`
  if (currency === 'CAD') return `CAD ${amount}`
  if (currency === 'EUR') return `€${amount}`
  return `$${amount}`
}

/**
 * Calculate fee breakdown for display
 * 
 * @param grossAmount - Gross sales in cents
 * @param currency - Currency code
 * @returns Human-readable fee breakdown
 */
export function getFeeBreakdown(
  grossAmount: number,
  currency: 'HTG' | 'USD' | 'CAD' | 'EUR' = 'HTG'
): {
  gross: string
  platformFee: string
  platformFeePercentage: string
  processingFee: string
  processingFeeDetails: string
  net: string
} {
  const fees = calculateFees(grossAmount)

  return {
    gross: formatCurrency(fees.grossAmount, currency),
    platformFee: formatCurrency(fees.platformFee, currency),
    platformFeePercentage: formatFeePercentage(FEE_CONFIG.PLATFORM_FEE_PERCENTAGE),
    processingFee: formatCurrency(fees.processingFee, currency),
    processingFeeDetails: `${formatFeePercentage(FEE_CONFIG.STRIPE_FEE_PERCENTAGE)} + ${formatCurrency(FEE_CONFIG.STRIPE_FEE_FIXED, currency)}`,
    net: formatCurrency(fees.netAmount, currency),
  }
}

/**
 * Calculate how much to charge customer including fees
 * (If we want to pass fees to customer instead of deducting from organizer)
 * 
 * @param ticketPrice - Base ticket price in cents
 * @param quantity - Number of tickets
 * @returns Total amount to charge customer
 */
export function calculateCustomerTotal(ticketPrice: number, quantity: number): number {
  const subtotal = ticketPrice * quantity
  // For now, we absorb fees. If we want to pass to customer:
  // const processingFee = calculateStripeFee(subtotal)
  // return subtotal + processingFee
  return subtotal
}

/**
 * Estimate net earnings for ticket price (for event creation)
 * 
 * @param ticketPrice - Proposed ticket price in cents
 * @returns Estimated net amount organizer will receive per ticket
 */
export function estimateNetPerTicket(ticketPrice: number): {
  ticketPrice: number
  platformFee: number
  processingFee: number
  netPerTicket: number
  netPercentage: number
} {
  const fees = calculateFees(ticketPrice)
  
  return {
    ticketPrice,
    platformFee: fees.platformFee,
    processingFee: fees.processingFee,
    netPerTicket: fees.netAmount,
    netPercentage: fees.netAmount / ticketPrice,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WHO PAYS THE FEE
//
// Two models, chosen per country by `feeIncidence` in lib/country-support.ts:
//
//   organizer (Haiti) — the buyer is charged exactly the face value and the fee
//     comes out of the organizer's proceeds. This is what every market did
//     before this existed.
//   buyer (US/CA/FR) — the fee is added on top, so the organizer keeps the full
//     face value and the buyer sees a total above the ticket price.
//
// The buyer model needs a GROSS-UP, not an addition. Stripe's percentage is
// charged on whatever we actually capture, so simply adding today's fee would
// leave the platform short by the percentage applied to the fee itself. Solving
// charge = face + platformFee + (charge * stripePct + stripeFixed) for `charge`
// keeps the organizer whole at exactly face value.
// ─────────────────────────────────────────────────────────────────────────────

export type FeeIncidence = 'organizer' | 'buyer'

export type BuyerPricing = {
  /** What the buyer is actually charged, in cents. */
  chargeAmount: number
  /** Ticket face value, in cents — what the organizer advertised. */
  faceValue: number
  /** Fee visible to the buyer as a line item. Zero in organizer-pays markets. */
  buyerFee: number
  platformFee: number
  processingFee: number
  /** What the organizer receives. Equals faceValue in buyer-pays markets. */
  organizerNet: number
  incidence: FeeIncidence
}

export function calculateBuyerPricing(
  faceValue: number,
  incidence: FeeIncidence,
  feePercentage: number = FEE_CONFIG.PLATFORM_FEE_PERCENTAGE
): BuyerPricing {
  if (faceValue <= 0) {
    return {
      chargeAmount: 0,
      faceValue: 0,
      buyerFee: 0,
      platformFee: 0,
      processingFee: 0,
      organizerNet: 0,
      incidence,
    }
  }

  if (incidence === 'organizer') {
    const platformFee = calculatePlatformFeeWithPercentage(faceValue, feePercentage)
    const processingFee = calculateStripeFee(faceValue)
    return {
      chargeAmount: faceValue,
      faceValue,
      buyerFee: 0,
      platformFee,
      processingFee,
      organizerNet: Math.max(0, faceValue - platformFee - processingFee),
      incidence,
    }
  }

  // Gross-up so the organizer nets exactly the face value.
  const platformFee = calculatePlatformFeeWithPercentage(faceValue, feePercentage)
  const target = faceValue + platformFee + FEE_CONFIG.STRIPE_FEE_FIXED
  const chargeAmount = Math.ceil(target / (1 - FEE_CONFIG.STRIPE_FEE_PERCENTAGE))
  const processingFee = calculateStripeFee(chargeAmount)

  return {
    chargeAmount,
    faceValue,
    buyerFee: chargeAmount - faceValue,
    platformFee,
    processingFee,
    // Rounding can leave a cent either way; never report more than was captured.
    organizerNet: Math.min(faceValue, chargeAmount - platformFee - processingFee),
    incidence,
  }
}
