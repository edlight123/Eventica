import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/admin/audit-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Flip EXISTING Stripe connected accounts onto the manual payout schedule.
 *
 * New accounts are created with settings.payouts.schedule.interval = 'manual'
 * (see app/api/organizer/stripe/connect/route.ts). Everything created before
 * that change is still on Stripe's AUTOMATIC schedule, which means Stripe moves
 * the organizer's balance to their bank on its own cadence — often before the
 * event happens — and our hold / release rules never get a say.
 *
 * GET  = DRY RUN. Reads every connected account we have on file and reports its
 *        current interval. Zero writes, safe to run as often as you like.
 * POST = APPLY. Updates the accounts that aren't already manual.
 *
 * Query params (both verbs):
 *   ?accountId=acct_x  restrict to a single account (test on one first)
 *   ?limit=N           process at most N accounts
 *
 * Release of the held balance is triggered by /api/cron/release-payouts.
 */

const MAX_LIMIT = 500

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Lazy load, same as the other Stripe routes: keeps the SDK out of any
  // bundle that doesn't call Stripe.
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

interface OwnedAccount {
  stripeAccountId: string
  organizerId: string
  /** Firestore path we read the id from, so an admin can trace a bad record. */
  source: string
}

interface AccountReport {
  stripeAccountId: string
  organizerId: string
  source: string
  interval: string | null
  payoutsEnabled: boolean
  chargesEnabled: boolean
  detailsSubmitted: boolean
  country: string | null
  alreadyManual: boolean
  /** POST only: whether this run actually changed the account. */
  updated?: boolean
  /** True when we changed (or would change) an account that can't pay out yet. */
  payoutsDisabledNote?: boolean
}

interface FailureReport {
  stripeAccountId: string
  organizerId: string
  stage: 'retrieve' | 'update'
  message: string
  stripeRequestId?: string
  stripeType?: string
}

function parseParams(request: NextRequest) {
  const accountIdRaw = String(request.nextUrl.searchParams.get('accountId') || '').trim()
  const limitRaw = String(request.nextUrl.searchParams.get('limit') || '').trim()

  const parsedLimit = limitRaw ? Number(limitRaw) : NaN
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), MAX_LIMIT)
      : null

  return { accountId: accountIdRaw || null, limit, limitInvalid: Boolean(limitRaw) && limit === null }
}

/**
 * Collect the connected accounts WE own, from our own records — never from
 * stripe.accounts.list(). A platform key can see accounts that don't belong to
 * this project (or to another environment's organizers); iterating our payout
 * profiles guarantees we only ever touch accounts we put there.
 *
 * Primary source: organizers/{id}/payoutProfiles/stripe_connect.
 * Secondary: organizers/{id}/payoutConfig/main, the legacy shape getPayoutProfile
 * still falls back to — those organizers are exactly the oldest ones, i.e. the
 * most likely to be on the automatic schedule.
 */
async function collectOwnedAccounts(): Promise<{ accounts: OwnedAccount[]; duplicates: number }> {
  const byAccountId = new Map<string, OwnedAccount>()
  let duplicates = 0

  const consider = (raw: unknown, organizerId: string, source: string) => {
    const stripeAccountId = String(raw || '').trim()
    if (!stripeAccountId.startsWith('acct_')) return
    if (byAccountId.has(stripeAccountId)) {
      duplicates++
      return
    }
    byAccountId.set(stripeAccountId, { stripeAccountId, organizerId, source })
  }

  const organizerIdOf = (doc: any): string => String(doc?.ref?.parent?.parent?.id || '')

  const profileSnap = await adminDb.collectionGroup('payoutProfiles').get()
  profileSnap.docs.forEach((doc: any) => {
    consider(doc.data()?.stripeAccountId, organizerIdOf(doc), doc.ref.path)
  })

  const legacySnap = await adminDb.collectionGroup('payoutConfig').get()
  legacySnap.docs.forEach((doc: any) => {
    consider(doc.data()?.stripeAccountId, organizerIdOf(doc), doc.ref.path)
  })

  return { accounts: Array.from(byAccountId.values()), duplicates }
}

function readInterval(account: any): string | null {
  const interval = account?.settings?.payouts?.schedule?.interval
  return interval ? String(interval) : null
}

function describeStripeError(error: any) {
  return {
    message: String(error?.raw?.message || error?.message || 'Unknown Stripe error'),
    stripeRequestId: error?.requestId || error?.raw?.requestId || undefined,
    stripeType: error?.type || error?.rawType || undefined,
  }
}

function toReport(owned: OwnedAccount, account: any): AccountReport {
  const interval = readInterval(account)
  return {
    stripeAccountId: owned.stripeAccountId,
    organizerId: owned.organizerId,
    source: owned.source,
    interval,
    payoutsEnabled: Boolean(account?.payouts_enabled),
    chargesEnabled: Boolean(account?.charges_enabled),
    detailsSubmitted: Boolean(account?.details_submitted),
    country: account?.country ? String(account.country) : null,
    alreadyManual: interval === 'manual',
  }
}

/**
 * Shared walk over our accounts. `apply` decides whether anything is written:
 * the GET path passes false and never calls accounts.update, so the dry run is
 * genuinely read-only.
 */
type RunOutcome =
  | { error: NextResponse; summary?: undefined; payload?: undefined }
  | {
      error?: undefined
      summary: {
        checked: number
        alreadyManual: number
        updated: number
        failed: number
        errors: FailureReport[]
      }
      payload: {
        mode: 'apply' | 'dry_run'
        needsUpdate: number
        totalOwnedAccounts: number
        totalCandidates: number
        skippedByLimit: number
        duplicateRecords: number
        payoutsDisabled: string[]
        accounts: AccountReport[]
      }
    }

async function run(request: NextRequest, apply: boolean): Promise<RunOutcome> {
  const { accountId, limit, limitInvalid } = parseParams(request)
  if (limitInvalid) {
    return { error: NextResponse.json({ error: 'limit must be a positive number' }, { status: 400 }) }
  }

  const { accounts: allAccounts, duplicates } = await collectOwnedAccounts()

  let selected = allAccounts
  if (accountId) {
    selected = selected.filter((a) => a.stripeAccountId === accountId)
    if (!selected.length) {
      return {
        error: NextResponse.json(
          {
            error: 'Unknown account',
            message: `${accountId} is not on any payout profile we own, so this endpoint will not touch it.`,
          },
          { status: 404 }
        ),
      }
    }
  }

  const totalCandidates = selected.length
  if (limit !== null) selected = selected.slice(0, limit)
  const processed = selected.length

  const stripe = getStripe()

  const results: AccountReport[] = []
  const errors: FailureReport[] = []
  let alreadyManual = 0
  let updated = 0

  // Sequential on purpose: a handful of accounts, live Stripe config, and no
  // reason to risk rate limits on a one-off migration.
  for (const owned of selected) {
    let account: any
    try {
      account = await stripe.accounts.retrieve(owned.stripeAccountId)
    } catch (error: any) {
      errors.push({
        stripeAccountId: owned.stripeAccountId,
        organizerId: owned.organizerId,
        stage: 'retrieve',
        ...describeStripeError(error),
      })
      continue
    }

    const report = toReport(owned, account)

    if (report.alreadyManual) {
      alreadyManual++
      if (apply) report.updated = false
      results.push(report)
      continue
    }

    // Worth flagging either way: an account that can't pay out yet is harmless
    // to switch, but the admin should see which ones they were.
    if (!report.payoutsEnabled) report.payoutsDisabledNote = true

    if (!apply) {
      results.push(report)
      continue
    }

    try {
      const updatedAccount = await stripe.accounts.update(owned.stripeAccountId, {
        settings: { payouts: { schedule: { interval: 'manual' } } },
      })
      report.interval = readInterval(updatedAccount)
      report.alreadyManual = report.interval === 'manual'
      report.updated = true
      updated++
      console.log(
        '[backfill-manual-payouts] set manual payouts',
        JSON.stringify({
          stripeAccountId: owned.stripeAccountId,
          organizerId: owned.organizerId,
          from: toReport(owned, account).interval,
          to: report.interval,
          payoutsEnabled: report.payoutsEnabled,
        })
      )
    } catch (error: any) {
      report.updated = false
      errors.push({
        stripeAccountId: owned.stripeAccountId,
        organizerId: owned.organizerId,
        stage: 'update',
        ...describeStripeError(error),
      })
    }

    results.push(report)
  }

  const needsUpdate = results.filter((r) => !r.alreadyManual).length
  const payoutsDisabled = results.filter((r) => r.payoutsDisabledNote).map((r) => r.stripeAccountId)

  return {
    summary: {
      // Every account we looked at, including the ones Stripe refused to
      // retrieve — those show up in errors[] rather than accounts[].
      checked: processed,
      alreadyManual,
      updated,
      failed: errors.length,
      errors,
    },
    payload: {
      mode: apply ? ('apply' as const) : ('dry_run' as const),
      // Dry run: how many we WOULD change. Apply: how many are still not manual
      // after the run (should equal the update failures).
      needsUpdate,
      totalOwnedAccounts: allAccounts.length,
      totalCandidates,
      skippedByLimit: Math.max(totalCandidates - processed, 0),
      duplicateRecords: duplicates,
      payoutsDisabled,
      accounts: results,
    },
  }
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const outcome = await run(request, false)
    if (outcome.error) return outcome.error

    return NextResponse.json({
      success: true,
      dryRun: true,
      ...outcome.payload,
      ...outcome.summary,
    })
  } catch (error: any) {
    console.error('[backfill-manual-payouts] dry run failed:', error)
    return NextResponse.json(
      { error: 'Dry run failed', message: String(error?.message || error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const outcome = await run(request, true)
    if (outcome.error) return outcome.error

    const { summary, payload } = outcome

    await logAdminAction({
      action: 'payout.manual_schedule.backfill',
      adminId: user.id,
      adminEmail: user.email || '',
      resourceType: 'stripe_connect_accounts',
      details: {
        updated: summary.updated,
        checked: summary.checked,
        failed: summary.failed,
        alreadyManual: summary.alreadyManual,
        // Exactly which accounts moved, so the money trail is reconstructable.
        updatedAccountIds: payload.accounts.filter((a) => a.updated).map((a) => a.stripeAccountId),
        payoutsDisabledAccountIds: payload.payoutsDisabled,
        errors: summary.errors,
        scope: {
          accountId: request.nextUrl.searchParams.get('accountId') || null,
          limit: request.nextUrl.searchParams.get('limit') || null,
        },
      },
    })

    return NextResponse.json({
      success: true,
      dryRun: false,
      ...payload,
      ...summary,
    })
  } catch (error: any) {
    console.error('[backfill-manual-payouts] apply failed:', error)
    return NextResponse.json(
      { error: 'Backfill failed', message: String(error?.message || error) },
      { status: 500 }
    )
  }
}
