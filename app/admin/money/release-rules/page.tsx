import { PayoutReleaseSettingsForm, type FxStatus } from './PayoutReleaseSettingsForm'
import { MONEY_TABS } from '../tabs'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'
import { adminDb } from '@/lib/firebase/admin'
import { getPlatformSettings } from '@/lib/admin/platform-settings'
import { DEFAULT_PAYOUT_RELEASE_CONFIG } from '@/types/platform-settings'
import {
  FX_SNAPSHOT_DOC,
  FX_SNAPSHOT_MAX_AGE_DAYS,
  resolveReferenceRates,
  type FxSnapshot,
} from '@/lib/payouts/fx-rates'

export const metadata = {
  title: 'Payout Release Settings | Admin | Tikèm',
  description: 'Holds, established tiers, review triggers and threshold FX rates for organizer payouts',
}

// Thresholds are read live in the client component, but the FX snapshot status
// below is read from Firestore per request, so this shell cannot be cached.
export const dynamic = 'force-dynamic'

/**
 * What the release cron would resolve right now: which currencies the daily
 * snapshot can answer for, and which fall back to the admin-maintained table.
 * Read here rather than through a new endpoint — this is the same merge the cron
 * performs, so the page shows the rates that would actually decide a payout.
 */
async function loadFxStatus(): Promise<FxStatus | null> {
  try {
    const [settings, snapshotDoc] = await Promise.all([
      getPlatformSettings(),
      adminDb.collection('platform_settings').doc(FX_SNAPSHOT_DOC).get(),
    ])

    const config = { ...DEFAULT_PAYOUT_RELEASE_CONFIG, ...(settings.payoutRelease || {}) }
    const snapshot = (snapshotDoc.exists ? (snapshotDoc.data() as FxSnapshot) : null) || null
    const resolved = resolveReferenceRates(config, snapshot)

    const snapshotCurrencies: string[] = []
    const manualCurrencies: string[] = []
    for (const [code, source] of Object.entries(resolved.sources).sort(([a], [b]) => a.localeCompare(b))) {
      ;(source === 'snapshot' ? snapshotCurrencies : manualCurrencies).push(code)
    }

    return {
      available: !!snapshot,
      provider: snapshot?.provider ? String(snapshot.provider) : null,
      fetchedAt: snapshot?.fetchedAt ? String(snapshot.fetchedAt) : null,
      ageHours: resolved.snapshotAgeHours,
      maxAgeDays: FX_SNAPSHOT_MAX_AGE_DAYS,
      snapshotCurrencies,
      manualCurrencies,
      warnings: resolved.warnings,
    }
  } catch (error) {
    // A missing snapshot must not take the settings page down — the form still
    // edits the fallback table, it just cannot say what the snapshot covers.
    console.error('Error loading FX snapshot status:', error)
    return null
  }
}

export default async function AdminPayoutReleaseRulesPage() {
  const fx = await loadFxStatus()

  return (
    <ConsolePage title="Money">
      <ConsoleTabs tabs={MONEY_TABS} />
      <ConsoleCaption>
        When ticket money is allowed to reach an organizer: holds, the established tier, what gets
        sent to review, and the rates that make one threshold mean the same thing in every currency.
      </ConsoleCaption>

      <PayoutReleaseSettingsForm fx={fx} />
    </ConsolePage>
  )
}
