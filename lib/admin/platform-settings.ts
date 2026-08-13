/**
 * Platform Settings Service
 * 
 * Manages platform-wide configuration including fees and settlement times
 */

import { adminDb } from '@/lib/firebase/admin'
import {
  PlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
  type EventLocation
} from '@/types/platform-settings'
import { invalidatePlatformFeeSettings } from '@/lib/checkout/fee-config-server'

const SETTINGS_COLLECTION = 'platform_settings'
const SETTINGS_DOC_ID = 'global'

/**
 * Get current platform settings
 * Returns default settings if none are configured
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const doc = await adminDb
      .collection(SETTINGS_COLLECTION)
      .doc(SETTINGS_DOC_ID)
      .get()

    if (!doc.exists) {
      return {
        id: SETTINGS_DOC_ID,
        ...DEFAULT_PLATFORM_SETTINGS,
      }
    }

    const data = doc.data() as PlatformSettings
    return {
      id: doc.id,
      ...data,
    }
  } catch (error) {
    console.error('Error fetching platform settings:', error)
    // Return defaults on error
    return {
      id: SETTINGS_DOC_ID,
      ...DEFAULT_PLATFORM_SETTINGS,
    }
  }
}

/**
 * Update platform settings
 */
export async function updatePlatformSettings(
  settings: Partial<Omit<PlatformSettings, 'id'>>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData = {
      ...settings,
      updatedAt: new Date(),
      updatedBy,
    }

    await adminDb
      .collection(SETTINGS_COLLECTION)
      .doc(SETTINGS_DOC_ID)
      .set(updateData, { merge: true })

    // Display pricing reads a cached copy of the fee config. Drop it here so THIS
    // process serves the new rate immediately; other instances pick it up when
    // their own TTL lapses.
    invalidatePlatformFeeSettings()

    return { success: true }
  } catch (error) {
    console.error('Error updating platform settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    }
  }
}

/**
 * Get platform fee percentage for a specific location
 */
export async function getPlatformFeePercentage(location: EventLocation): Promise<number> {
  const settings = await getPlatformSettings()
  return location === 'haiti' 
    ? settings.haiti.platformFeePercentage 
    : settings.usCanada.platformFeePercentage
}

/**
 * Get settlement hold days for a specific location
 */
export async function getSettlementHoldDays(location: EventLocation): Promise<number> {
  const settings = await getPlatformSettings()
  return location === 'haiti'
    ? settings.haiti.settlementHoldDays
    : settings.usCanada.settlementHoldDays
}

/**
 * Get minimum payout amount
 */
export async function getMinimumPayoutAmount(): Promise<number> {
  const settings = await getPlatformSettings()
  return settings.minimumPayoutAmount
}

/**
 * Initialize platform settings if they don't exist
 */
export async function initializePlatformSettings(): Promise<void> {
  try {
    const doc = await adminDb
      .collection(SETTINGS_COLLECTION)
      .doc(SETTINGS_DOC_ID)
      .get()

    if (!doc.exists) {
      await adminDb
        .collection(SETTINGS_COLLECTION)
        .doc(SETTINGS_DOC_ID)
        .set({
          ...DEFAULT_PLATFORM_SETTINGS,
          updatedAt: new Date(),
          updatedBy: 'system',
        })
      console.log('✓ Platform settings initialized with defaults')
    }
  } catch (error) {
    console.error('Error initializing platform settings:', error)
  }
}
