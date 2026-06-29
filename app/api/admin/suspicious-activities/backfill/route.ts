import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function safeJsonParse(value: any): any {
  if (value == null) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * Backfill legacy suspicious activities (Supabase table) into Firestore.
 *
 * POST body:
 * - limit?: number (default 200, max 500)
 * - since?: string (ISO timestamp; only rows with detected_at >= since)
 * - dryRun?: boolean (default false)
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const body = await req.json().catch(() => ({}))
    const limit = clampInt(body?.limit, 1, 500, 200)
    const since = typeof body?.since === 'string' ? body.since : null
    const dryRun = Boolean(body?.dryRun)

    const supabase = await createClient()

    let query = supabase
      .from('suspicious_activities')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gte('detected_at', since)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      console.error('Backfill suspicious_activities query failed:', dbError)
      return adminError('Failed to read legacy suspicious activities', 500, dbError.message)
    }

    const rows = Array.isArray(data) ? data : []

    let written = 0
    let skipped = 0
    const errors: Array<{ id: string; error: string }> = []

    if (!dryRun) {
      for (const row of rows) {
        const id = String(row?.id || '').trim()
        if (!id) {
          skipped++
          continue
        }

        const doc = {
          user_id: row?.user_id ?? null,
          activity_type: row?.activity_type ?? null,
          description: row?.description ?? null,
          severity: row?.severity ?? 'low',
          ip_address: row?.ip_address ?? null,
          detected_at: row?.detected_at ?? null,
          reviewed: Boolean(row?.reviewed),
          reviewed_by: row?.reviewed_by ?? null,
          reviewed_at: row?.reviewed_at ?? null,
          action_taken: row?.action_taken ?? null,
          metadata: safeJsonParse(row?.metadata) ?? null,
          migrated_from_legacy: true,
          migrated_at: new Date().toISOString(),
        }

        try {
          await adminDb.collection('suspicious_activities').doc(id).set(doc, { merge: true })
          written++
        } catch (err: any) {
          errors.push({ id, error: err?.message || String(err) })
        }
      }
    }

    await logAdminAction({
      action: 'admin.backfill',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'suspicious_activities',
      details: {
        name: 'suspicious-activities.backfill',
        dryRun,
        processed: rows.length,
        written: dryRun ? 0 : written,
        skipped: dryRun ? 0 : skipped,
        since,
        limit,
        errors: errors.length,
      },
    })

    return adminOk({
      dryRun,
      processed: rows.length,
      written: dryRun ? 0 : written,
      skipped: dryRun ? 0 : skipped,
      errors,
    })
  } catch (err: any) {
    console.error('Backfill suspicious activities error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}
