import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDeploymentMeta() {
  return {
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
    vercelGitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, OPTIONS',
    },
  })
}

type Body = {
  dryRun?: boolean
  limit?: number
  includeFirestore?: boolean
}

type FirestoreSummary =
  | { skipped: true }
  | {
      attempted: number
      found: number
      updated: number
      missing: number
      examples: Array<{ id: string; title?: string; oldCurrency?: string; newCurrency: string }>
    }

function isTruthy(value: unknown): boolean {
  return String(value || '').toLowerCase() === 'true'
}

export async function GET() {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    return adminOk({
      deployment: getDeploymentMeta(),
      message:
        'Use POST to migrate Canada events to CAD. Start with dryRun=true. This updates Supabase by default, and optionally Firestore when includeFirestore=true.',
    })
  } catch (err: any) {
    console.error('migrate-canada-currency GET error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const body = (await request.json().catch(() => ({}))) as Body
    const dryRun = Boolean(body?.dryRun)
    const limit = Math.min(Math.max(Number(body?.limit || 500), 1), 5000)
    // Firestore is now OPT-IN ONLY due to index issues; default to Supabase-only migration
    const includeFirestore = false // body?.includeFirestore === true || isTruthy(body?.includeFirestore)

    const supabase = await createClient()

    // Fetch ALL events since Firestore wrapper doesn't support .in('country') without an index.
    // We'll filter by country in JS to avoid the FAILED_PRECONDITION index error.
    // Fetch a large batch to ensure we get all Canada events (not just the first 20)
    const fetchLimit = Math.max(limit * 10, 1000)
    console.log('🔍 Migration fetch limit:', fetchLimit, '(from request limit:', limit, ')')
    
    // First check: how many events exist total without any limit or ordering
    const { data: testFetch, error: testErr } = await supabase
      .from('events')
      .select('id')
    console.log('🧪 TEST: Total events in database (no limit):', testFetch?.length || 0)
    
    // Don't use .order() - it may silently fail due to missing index
    const { data: allEvents, error: fetchErr } = await supabase
      .from('events')
      .select('id,title,country,currency,ticket_price,organizer_id')
      .limit(fetchLimit)

    if (fetchErr) {
      return adminError(fetchErr.message || 'Failed to query events', 500)
    }

    console.log('📊 Fetched', allEvents?.length || 0, 'events (requested limit:', fetchLimit, ')')

    // Filter for Canada events with USD or empty currency
    const caEvents = (allEvents || []).filter((e: any) => {
      const country = String(e?.country || '').trim().toUpperCase()
      return country === 'CA' || country === 'CANADA'
    })

    const candidates = caEvents.filter((e: any) => {
      const currency = String(e?.currency || '').trim().toUpperCase()
      return !currency || currency === 'USD'
    })

    const toUpdate = candidates.slice(0, limit)

    const updatedSupabaseIds: string[] = []
    const examples = toUpdate.slice(0, 25).map((e: any) => ({
      id: e.id,
      title: e.title,
      oldCurrency: String(e.currency || ''),
      newCurrency: 'CAD',
    }))

    if (!dryRun && toUpdate.length > 0) {
      // Update events individually to avoid Firestore .in() index requirement
      for (const event of toUpdate) {
        const { error: updateErr } = await supabase
          .from('events')
          .update({ currency: 'CAD', updated_at: new Date().toISOString() })
          .eq('id', event.id)

        if (updateErr) {
          console.error(`Failed to update event ${event.id}:`, updateErr)
          continue
        }
        
        updatedSupabaseIds.push(event.id)
      }
    }

    // Optional: update Firestore mirror so Discover/display stays consistent if it reads Firestore.
    let firestore: FirestoreSummary = { skipped: true }

    if (includeFirestore) {
      // IMPORTANT: Avoid querying Firestore by country, since some deployments disable single-field
      // indexing on `events.country` which triggers FAILED_PRECONDITION index errors.
      // Instead, update the Firestore mirror by Supabase event id (which should match the doc id).
      const ids = toUpdate.map((e: any) => String(e.id))
      const firestoreExamples: Array<{ id: string; title?: string; oldCurrency?: string; newCurrency: string }> = []
      let found = 0
      let missing = 0
      let updated = 0
      let attempted = ids.length

      let batch = adminDb.batch()
      let batchOps = 0
      const commitIfNeeded = async () => {
        if (!dryRun && batchOps > 0) {
          await batch.commit()
          batch = adminDb.batch()
          batchOps = 0
        }
      }

      for (const id of ids) {
        const ref = adminDb.collection('events').doc(id)
        const snap = await ref.get()
        if (!snap.exists) {
          missing += 1
          continue
        }

        found += 1
        const data: any = snap.data() || {}
        const current = String(data.currency || '').trim().toUpperCase()
        if (current && current !== 'USD') {
          continue
        }

        updated += 1
        if (firestoreExamples.length < 25) {
          firestoreExamples.push({
            id,
            title: data.title,
            oldCurrency: data.currency,
            newCurrency: 'CAD',
          })
        }

        if (!dryRun) {
          batch.update(ref, { currency: 'CAD', updated_at: new Date() })
          batchOps += 1
          if (batchOps >= 450) {
            await commitIfNeeded()
          }
        }
      }

      await commitIfNeeded()

      firestore = {
        attempted,
        found,
        updated: dryRun ? 0 : updated,
        missing,
        examples: firestoreExamples,
      }
    }

    await logAdminAction({
      action: 'admin.backfill',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'events',
      details: {
        name: 'events.migrate-canada-currency',
        dryRun,
        limit,
        includeFirestore,
        supabase: {
          fetched: (allEvents || []).length,
          canadaEvents: caEvents.length,
          candidates: candidates.length,
          updated: dryRun ? 0 : updatedSupabaseIds.length,
        },
        firestore,
      },
    })

    return adminOk({
      deployment: getDeploymentMeta(),
      dryRun,
      limit,
      fetchLimit, // Show actual fetch limit used
      supabase: {
        fetched: (allEvents || []).length,
        canadaEvents: caEvents.length,
        candidates: candidates.length,
        updated: dryRun ? 0 : updatedSupabaseIds.length,
        examples,
      },
      firestore,
      warning:
        'This migration only changes currency codes (USD→CAD) without converting prices. If you need FX conversion for existing CAD events, we should do a separate rate-based migration.',
    })
  } catch (err: any) {
    console.error('migrate-canada-currency POST error:', err)
    console.error('Error stack:', err?.stack)
    console.error('Error code:', err?.code)
    console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    return adminError('Internal server error', 500, err?.message || 'Unknown error')
  }
}
