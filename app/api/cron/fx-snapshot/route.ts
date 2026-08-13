import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getPlatformSettings } from '@/lib/admin/platform-settings'
import {
  DEFAULT_PAYOUT_RELEASE_CONFIG,
  type PayoutReleaseConfig,
} from '@/types/platform-settings'
import { FX_SNAPSHOT_DOC, isImplausibleMove, type FxSnapshot } from '@/lib/payouts/fx-rates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily FX snapshot for payout thresholds.
 *
 * Runs once a day and stores the rates. The release cron READS this doc; it never
 * fetches a rate itself, because a lookup failing or spiking mid-run would change
 * who gets paid. If this job breaks, releases keep using the last good snapshot
 * and eventually fall back to the admin-maintained table — they never stall and
 * never silently re-scale.
 *
 * Rates are stored MID-MARKET, with no spread. The spread in lib/fx/usd-htg.ts is
 * a pricing device for converting a buyer's money; applying it here would shift a
 * Haitian organizer's "established" bar by the spread for no risk reason.
 *
 * Schedule: vercel.json → "0 5 * * *" (daily, after most markets have set).
 */

const PROVIDER_URL = process.env.FX_USD_HTG_URL || 'https://open.er-api.com/v6/latest/USD'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getPlatformSettings()
    const config: PayoutReleaseConfig = {
      ...DEFAULT_PAYOUT_RELEASE_CONFIG,
      ...(settings.payoutRelease || {}),
    }
    const thresholdCurrency = (config.thresholdCurrency || 'USD').toUpperCase()

    // Which currencies to snapshot: whatever the admin table already tracks. That
    // keeps this job in step with the thresholds rather than guessing a list.
    const wanted = Object.keys(config.referenceRates || {})
      .map((c) => c.toUpperCase())
      .filter((c) => c !== thresholdCurrency)

    if (!wanted.length) {
      return NextResponse.json({ success: true, skipped: 'no_currencies_configured' })
    }

    if (thresholdCurrency !== 'USD') {
      // The provider endpoint is USD-based. Rather than silently mis-quote, say so.
      return NextResponse.json(
        {
          success: false,
          error: `FX provider is USD-based but thresholds are in ${thresholdCurrency}. Update the provider or the threshold currency.`,
        },
        { status: 400 }
      )
    }

    const response = await fetch(PROVIDER_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `FX fetch failed: ${response.status} ${response.statusText}` },
        { status: 502 }
      )
    }
    const payload = await response.json()
    const providerRates: Record<string, unknown> = payload?.rates || payload?.conversion_rates || {}
    const provider = String(payload?.provider || payload?.base_code || 'open.er-api.com')

    const snapshotRef = adminDb.collection('platform_settings').doc(FX_SNAPSHOT_DOC)
    const previous = (await snapshotRef.get()).data() as FxSnapshot | undefined

    const rates: Record<string, number> = { [thresholdCurrency]: 1 }
    const baseRates: Record<string, number> = {}
    const missing: string[] = []
    const rejected: Record<string, number> = {}

    for (const code of wanted) {
      const perUsd = Number(providerRates[code])
      if (!Number.isFinite(perUsd) || perUsd <= 0) {
        missing.push(code)
        continue
      }
      // Provider gives units-per-USD (e.g. 131 HTG per USD). Thresholds need
      // USD-per-unit, so invert.
      const usdPerUnit = 1 / perUsd

      if (isImplausibleMove(previous?.rates?.[code], usdPerUnit)) {
        // A provider returning 0, 1, or an inverted figure must not quietly move
        // the bar for who gets paid early. Keep the last accepted value and flag.
        rejected[code] = usdPerUnit
        if (previous?.rates?.[code]) rates[code] = previous.rates[code]
        continue
      }

      rates[code] = usdPerUnit
      baseRates[code] = perUsd
    }

    const snapshot: FxSnapshot = {
      rates,
      baseRates,
      thresholdCurrency,
      provider,
      fetchedAt: new Date().toISOString(),
      ...(missing.length ? { missing } : {}),
      ...(Object.keys(rejected).length ? { rejected } : {}),
    }

    await snapshotRef.set(snapshot, { merge: false })

    // Keep a dated history so a past release decision can be reconstructed with
    // the rate that actually produced it.
    const dayKey = snapshot.fetchedAt.slice(0, 10)
    await adminDb.collection('fx_snapshots').doc(dayKey).set(snapshot, { merge: true })

    return NextResponse.json({
      success: true,
      snapshot,
      note:
        Object.keys(rejected).length || missing.length
          ? 'Some rates were rejected or missing; those currencies keep their previous or manual value.'
          : undefined,
    })
  } catch (error: any) {
    console.error('[cron/fx-snapshot] failed', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'FX snapshot failed' },
      { status: 500 }
    )
  }
}
