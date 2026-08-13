import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getPlatformSettings, updatePlatformSettings } from '@/lib/admin/platform-settings'
import { logAdminAction } from '@/lib/admin/audit-log'
import {
  DEFAULT_PAYOUT_RELEASE_CONFIG,
  type PayoutReleaseConfig,
} from '@/types/platform-settings'

export const runtime = 'nodejs'

/**
 * Platform-wide payout release thresholds — the holds, tier cut-offs, reserve
 * percentage and review triggers behind lib/payouts/release-rules.ts.
 *
 * GET  returns the live config (defaults filled in for older settings docs).
 * PUT  patches it. Every change is audit-logged with the before/after, because
 *      these knobs decide when other people's money moves.
 *
 * Per-organizer overrides live at /api/admin/organizers/[id]/payout-release.
 */

const NUMERIC_FIELDS: (keyof PayoutReleaseConfig)[] = [
  'newHoldHours',
  'establishedHoldHours',
  'establishedAfterEvents',
  'establishedAfterGrossMinor',
  'preEventEligibleGrossMinor',
  'reviewAboveGrossMinor',
  'reserveBps',
  'reserveDays',
  'manualCheckInReviewRatio',
  'lowAttendanceReviewRatio',
]

/** Guard rails so a typo can't hold everyone's money for a decade. */
const LIMITS: Partial<Record<keyof PayoutReleaseConfig, { min: number; max: number }>> = {
  newHoldHours: { min: 0, max: 720 },
  establishedHoldHours: { min: 0, max: 720 },
  establishedAfterEvents: { min: 0, max: 100 },
  establishedAfterGrossMinor: { min: 0, max: 100_000_000 },
  preEventEligibleGrossMinor: { min: 0, max: 100_000_000 },
  reviewAboveGrossMinor: { min: 0, max: 100_000_000 },
  reserveBps: { min: 0, max: 5000 }, // never withhold more than half
  reserveDays: { min: 0, max: 365 },
  manualCheckInReviewRatio: { min: 0, max: 1 },
  lowAttendanceReviewRatio: { min: 0, max: 1 },
}

export async function GET() {
  const { user, error } = await requireAdmin()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await getPlatformSettings()
  return NextResponse.json({
    config: { ...DEFAULT_PAYOUT_RELEASE_CONFIG, ...(settings.payoutRelease || {}) },
    defaults: DEFAULT_PAYOUT_RELEASE_CONFIG,
    limits: LIMITS,
  })
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const settings = await getPlatformSettings()
  const before: PayoutReleaseConfig = {
    ...DEFAULT_PAYOUT_RELEASE_CONFIG,
    ...(settings.payoutRelease || {}),
  }

  const next: PayoutReleaseConfig = { ...before }
  const rejected: string[] = []

  for (const field of NUMERIC_FIELDS) {
    const raw = (body as any)?.[field]
    if (raw === undefined || raw === null || raw === '') continue
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      rejected.push(`${field}: not a number`)
      continue
    }
    const limit = LIMITS[field]
    if (limit && (value < limit.min || value > limit.max)) {
      rejected.push(`${field}: must be between ${limit.min} and ${limit.max}`)
      continue
    }
    ;(next as any)[field] = value
  }

  if (typeof (body as any)?.reserveNewOrganizersOnly === 'boolean') {
    next.reserveNewOrganizersOnly = (body as any).reserveNewOrganizersOnly
  }

  if (rejected.length) {
    return NextResponse.json({ error: 'Invalid values', details: rejected }, { status: 400 })
  }

  const changed = NUMERIC_FIELDS.filter((f) => before[f] !== next[f]).concat(
    before.reserveNewOrganizersOnly !== next.reserveNewOrganizersOnly
      ? (['reserveNewOrganizersOnly'] as any)
      : []
  )

  if (!changed.length) {
    return NextResponse.json({ success: true, config: next, changed: [] })
  }

  const result = await updatePlatformSettings({ payoutRelease: next }, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Could not save' }, { status: 500 })
  }

  await logAdminAction({
    action: 'payout.release_config.update',
    adminId: user.id,
    adminEmail: user.email || '',
    resourceType: 'platform_settings',
    details: {
      changed,
      before: Object.fromEntries(changed.map((f) => [f, (before as any)[f]])),
      after: Object.fromEntries(changed.map((f) => [f, (next as any)[f]])),
    },
  })

  return NextResponse.json({ success: true, config: next, changed })
}
