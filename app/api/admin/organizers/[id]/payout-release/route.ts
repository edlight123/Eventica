import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/admin/audit-log'
import type { PayoutReleaseOverride } from '@/types/platform-settings'

export const runtime = 'nodejs'

/**
 * Per-organizer payout release overrides: hand-tune one promoter without moving
 * the platform thresholds for everyone.
 *
 * The two flags that matter most:
 *   preEventReleaseApproved — pay this organizer BEFORE their event ends. Never
 *     automatic anywhere in the system; it advances money against undelivered
 *     service, so it takes an admin who knows the promoter.
 *   highRisk — force every payout through review regardless of tier.
 *
 * Stored on organizers/{id}.payoutRelease and layered over the platform config
 * by resolveConfig() in lib/payouts/release-rules.ts. A null value CLEARS a
 * field so it falls back to the platform default.
 */

const NUMERIC_FIELDS: (keyof PayoutReleaseOverride)[] = [
  'newHoldHours',
  'establishedHoldHours',
  'reviewAboveGrossMinor',
]

const LIMITS: Partial<Record<keyof PayoutReleaseOverride, { min: number; max: number }>> = {
  newHoldHours: { min: 0, max: 720 },
  establishedHoldHours: { min: 0, max: 720 },
  reviewAboveGrossMinor: { min: 0, max: 100_000_000 },
}

const BOOLEAN_FIELDS: (keyof PayoutReleaseOverride)[] = [
  'preEventReleaseApproved',
  'highRisk',
  'forceEstablished',
]

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const snap = await adminDb.collection('organizers').doc(id).get()
  return NextResponse.json({ override: (snap.data() as any)?.payoutRelease || null })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const orgRef = adminDb.collection('organizers').doc(id)
  const before = ((await orgRef.get()).data() as any)?.payoutRelease || {}

  const next: Record<string, any> = { ...before }
  const rejected: string[] = []

  for (const field of NUMERIC_FIELDS) {
    if (!(field in (body as any))) continue
    const raw = (body as any)[field]
    if (raw === null || raw === '') {
      delete next[field] // clear → fall back to the platform default
      continue
    }
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
    next[field] = value
  }

  for (const field of BOOLEAN_FIELDS) {
    if (!(field in (body as any))) continue
    const raw = (body as any)[field]
    if (raw === null) {
      delete next[field]
      continue
    }
    next[field] = Boolean(raw)
  }

  // An override that loosens the rules has to be explained — it is the record of
  // WHY this promoter is trusted, read later when something goes wrong.
  const loosening =
    next.preEventReleaseApproved === true || next.forceEstablished === true
  const note = typeof (body as any)?.note === 'string' ? (body as any).note.slice(0, 500).trim() : ''
  if (loosening && !note && !before?.note) {
    return NextResponse.json(
      { error: 'A note is required when relaxing payout rules for an organizer', code: 'note_required' },
      { status: 400 }
    )
  }

  if (rejected.length) {
    return NextResponse.json({ error: 'Invalid values', details: rejected }, { status: 400 })
  }

  next.updatedAt = new Date().toISOString()
  next.updatedBy = user.id
  if (note) next.note = note

  await orgRef.set({ payoutRelease: next }, { merge: true })

  await logAdminAction({
    action: 'payout.release_override.update',
    adminId: user.id,
    adminEmail: user.email || '',
    resourceId: id,
    resourceType: 'organizer',
    details: { before, after: next, note: note || before?.note || null },
  })

  return NextResponse.json({ success: true, override: next })
}
