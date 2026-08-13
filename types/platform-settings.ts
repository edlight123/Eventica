/**
 * Platform Settings Configuration
 * 
 * Defines configurable platform-wide settings including fees and settlement times
 */

/**
 * Location-based fee configuration
 */
export interface LocationFeeConfig {
  /**
   * Platform fee percentage (e.g., 0.10 for 10%)
   */
  platformFeePercentage: number
  
  /**
   * Settlement hold days after event before funds are available
   */
  settlementHoldDays: number
}


/**
 * Payout release configuration — the knobs behind lib/payouts/release-rules.ts.
 * Admin-editable so thresholds can be tuned from the dashboard rather than a
 * deploy, and per-organizer overrides can sit on top (see PayoutReleaseOverride).
 */
export interface PayoutReleaseConfig {
  /** Hold after event end for organizers who are still new, in hours. */
  newHoldHours: number
  /** Hold after event end once established, in hours. */
  establishedHoldHours: number
  /** Clean events needed to become established. */
  establishedAfterEvents: number
  /** …or lifetime gross (minor units) needed, whichever comes first. */
  establishedAfterGrossMinor: number
  /** Lifetime gross (minor units) that makes pre-event release admin-grantable. */
  preEventEligibleGrossMinor: number
  /** Per-event gross (minor units) above which a new organizer goes to review. */
  reviewAboveGrossMinor: number
  /** Chargeback reserve on CARD sales, in basis points (1000 = 10%). */
  reserveBps: number
  /** How long the reserve is held, in days. */
  reserveDays: number
  /** Reserve applies only while an organizer is new. Set false to always hold it. */
  reserveNewOrganizersOnly: boolean
  /** Check-in ratios that route a payout to review. */
  manualCheckInReviewRatio: number
  lowAttendanceReviewRatio: number
}

/**
 * Per-organizer overrides. Any field left undefined falls through to the
 * platform PayoutReleaseConfig. Stored on the organizer document so an admin can
 * hand-tune one promoter without touching everyone.
 */
export interface PayoutReleaseOverride {
  newHoldHours?: number
  establishedHoldHours?: number
  reserveBps?: number
  reserveDays?: number
  reviewAboveGrossMinor?: number
  /** Explicit admin grant allowing payout BEFORE the event ends. */
  preEventReleaseApproved?: boolean
  /** Force every payout through review regardless of tier. */
  highRisk?: boolean
  /** Treat as established regardless of history (known promoter). */
  forceEstablished?: boolean
  updatedAt?: string
  updatedBy?: string
  note?: string
}

export const DEFAULT_PAYOUT_RELEASE_CONFIG: PayoutReleaseConfig = {
  newHoldHours: 72,
  establishedHoldHours: 24,
  establishedAfterEvents: 3,
  establishedAfterGrossMinor: 100_000,
  preEventEligibleGrossMinor: 200_000,
  reviewAboveGrossMinor: 100_000,
  reserveBps: 1000,
  reserveDays: 30,
  reserveNewOrganizersOnly: true,
  manualCheckInReviewRatio: 0.8,
  lowAttendanceReviewRatio: 0.2,
}

/**
 * Platform settings stored in Firestore
 */
export interface PlatformSettings {
  id?: string
  
  /**
   * Fee configuration for Haiti events
   */
  haiti: LocationFeeConfig
  
  /**
   * Fee configuration for US/Canada events
   */
  usCanada: LocationFeeConfig
  
  /**
   * Minimum payout amount in cents
   */
  minimumPayoutAmount: number

  /**
   * Payout release thresholds. Optional so existing settings docs keep working;
   * readers fall back to DEFAULT_PAYOUT_RELEASE_CONFIG.
   */
  payoutRelease?: PayoutReleaseConfig
  
  /**
   * Last updated timestamp
   */
  updatedAt?: Date | FirebaseFirestore.Timestamp
  
  /**
   * Admin who last updated
   */
  updatedBy?: string
}

/**
 * Default platform settings
 */
export const DEFAULT_PLATFORM_SETTINGS: Omit<PlatformSettings, 'id' | 'updatedAt' | 'updatedBy'> = {
  haiti: {
    platformFeePercentage: 0.05,  // 5% for Haiti events
    settlementHoldDays: 0,         // No hold for Haiti events
  },
  usCanada: {
    platformFeePercentage: 0.10,  // 10% for US/Canada events
    settlementHoldDays: 7,         // 7 days hold for US/Canada events
  },
  minimumPayoutAmount: 5000,      // $50.00 in cents
  payoutRelease: DEFAULT_PAYOUT_RELEASE_CONFIG,
}

/**
 * Location type for fee calculations
 */
export type EventLocation = 'haiti' | 'us-canada'

/**
 * Determine event location from country code
 */
export function getEventLocation(countryCode: string): EventLocation {
  const normalized = countryCode.toUpperCase().trim()
  if (normalized === 'HT' || normalized === 'HAITI') {
    return 'haiti'
  }
  return 'us-canada'
}
