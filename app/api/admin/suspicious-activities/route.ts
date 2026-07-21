import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

type NormalizedSuspiciousActivity = {
  id: string
  user_id: string | null
  activity_type: string | null
  description: string | null
  severity: 'low' | 'medium' | 'high' | 'critical' | string
  ip_address: string | null
  detected_at: string | null
  reviewed: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  action_taken: string | null
}

function toIsoString(value: any): string | null {
  if (!value) return null
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate()
      if (d instanceof Date) return d.toISOString()
    } catch {
      return null
    }
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

async function fetchSuspiciousActivitiesFromFirestore(params: {
  reviewed: string | null
  severity: string | null
  activityType: string | null
  limit: number
}): Promise<null | { activities: any[]; unreviewedCount: number; total: number }> {
  try {
    // Check if adminDb is properly initialized
    if (!adminDb || !adminDb.collection) {
      console.warn('adminDb not initialized, skipping Firestore query')
      return null
    }

    const baseSnap = await adminDb
      .collection('suspicious_activities')
      .orderBy('detected_at', 'desc')
      .limit(Math.max(1, Math.min(params.limit * 3, 200)))
      .get()

    if (baseSnap.empty) {
      return { activities: [], unreviewedCount: 0, total: 0 }
    }

    const normalized: NormalizedSuspiciousActivity[] = baseSnap.docs.map((doc: any) => {
      const data = doc.data() || {}
      const userId = data.user_id ?? data.userId ?? null
      return {
        id: doc.id,
        user_id: userId,
        activity_type: data.activity_type ?? data.activityType ?? null,
        description: data.description ?? null,
        severity: data.severity ?? 'low',
        ip_address: data.ip_address ?? data.ipAddress ?? null,
        detected_at: toIsoString(data.detected_at) ?? toIsoString(data.detectedAt) ?? null,
        reviewed: Boolean(data.reviewed),
        reviewed_by: data.reviewed_by ?? data.reviewedBy ?? null,
        reviewed_at: toIsoString(data.reviewed_at) ?? toIsoString(data.reviewedAt) ?? null,
        action_taken: data.action_taken ?? data.actionTaken ?? null,
      }
    })

    let filtered: NormalizedSuspiciousActivity[] = normalized

    if (params.reviewed !== null) {
      const reviewedBool = params.reviewed === 'true'
      filtered = filtered.filter((a: NormalizedSuspiciousActivity) => a.reviewed === reviewedBool)
    }
    if (params.severity) {
      filtered = filtered.filter((a: NormalizedSuspiciousActivity) => a.severity === params.severity)
    }
    if (params.activityType) {
      filtered = filtered.filter(
        (a: NormalizedSuspiciousActivity) => a.activity_type === params.activityType
      )
    }

    filtered = filtered.slice(0, params.limit)

    const userIds = Array.from(new Set(filtered.map((a: NormalizedSuspiciousActivity) => a.user_id).filter(Boolean)))
    const usersMap = new Map<string, { name: string; email: string }>()

    if (userIds.length > 0) {
      // Resolve users by document reference (getAll) rather than a
      // `where('__name__', 'in', batch)` query: filtering on the documentId
      // requires Key values, not bare id strings, so passing plain ids throws
      // "__key__ filter value must be a Key". getAll takes plain refs, has no
      // 10-item cap, and returns missing docs with `exists === false`.
      const refs = (userIds as string[]).map((id) => adminDb.collection('users').doc(id))
      const docs = await adminDb.getAll(...refs)
      for (const doc of docs) {
        if (!doc.exists) continue
        const data = doc.data() || {}
        usersMap.set(doc.id, {
          name: data.full_name || data.name || data.email || 'Unknown',
          email: data.email || '',
        })
      }
    }

    const activities = filtered.map((a: NormalizedSuspiciousActivity) => {
      const u = a.user_id ? usersMap.get(a.user_id) : null
      return {
        ...a,
        ...(u ? { users: u } : {}),
      }
    })

    let unreviewedCount = 0
    try {
      const countSnap = await adminDb
        .collection('suspicious_activities')
        .where('reviewed', '==', false)
        .count()
        .get()
      unreviewedCount = Number(countSnap.data().count || 0)
    } catch (countErr) {
      console.warn('Count aggregation failed, using fallback method:', countErr)
      try {
        const unreviewedSnap = await adminDb
          .collection('suspicious_activities')
          .where('reviewed', '==', false)
          .limit(500)
          .get()
        unreviewedCount = unreviewedSnap.size
      } catch (fallbackErr) {
        console.warn('Fallback count also failed:', fallbackErr)
        unreviewedCount = 0
      }
    }

    return {
      activities,
      unreviewedCount,
      total: activities.length,
    }
  } catch (err) {
    console.warn('Firestore suspicious_activities read failed; falling back to legacy:', err)
    return null
  }
}

/**
 * Admin endpoint to view suspicious activities
 * Requires admin privileges
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAdmin()
    if (authError || !user) {
      return adminError(authError || 'Unauthorized', 401)
    }

    const { searchParams } = new URL(req.url)
    const reviewed = searchParams.get('reviewed')
    const severity = searchParams.get('severity')
    const activityType = searchParams.get('activityType')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Firestore-first (migration path). If Firestore is empty/unavailable, fall back to legacy DB.
    let firestoreResult = null
    try {
      firestoreResult = await fetchSuspiciousActivitiesFromFirestore({
        reviewed,
        severity,
        activityType,
        limit,
      })
    } catch (fsErr) {
      console.warn('Firestore query failed, falling back to legacy DB:', fsErr)
    }

    if (firestoreResult && firestoreResult.total > 0) {
      return adminOk({
        activities: firestoreResult.activities,
        unreviewedCount: firestoreResult.unreviewedCount,
        total: firestoreResult.total,
      })
    }

    const supabase = await createClient()

    let query = supabase
      .from('suspicious_activities')
      .select('*, users(name, email)')
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (reviewed !== null) {
      query = query.eq('reviewed', reviewed === 'true')
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (activityType) {
      query = query.eq('activity_type', activityType)
    }

    const { data: activities, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching suspicious activities from legacy DB:', queryError)
      // Return empty result instead of 500 if both Firestore and legacy fail
      return adminOk({
        activities: [],
        unreviewedCount: 0,
        total: 0,
      })
    }

    // Get count of unreviewed activities
    const { data: unreviewedActivities } = await supabase
      .from('suspicious_activities')
      .select('id')
      .eq('reviewed', false)

    return adminOk({
      activities: activities || [],
      unreviewedCount: unreviewedActivities?.length || 0,
      total: activities?.length || 0,
    })
  } catch (err) {
    console.error('Error in suspicious activities endpoint:', err)
    return adminError('Internal server error', 500)
  }
}

/**
 * Mark suspicious activity as reviewed
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAdmin()
    if (authError || !user) {
      return adminError(authError || 'Unauthorized', 401)
    }

    const { activityId, actionTaken } = await req.json()

    if (!activityId) {
      return adminError('Activity ID is required', 400)
    }

    // If the activity exists in Firestore, update it there (migration path).
    let hasFirestore = false
    try {
      if (adminDb && adminDb.collection) {
        const firestoreRef = adminDb.collection('suspicious_activities').doc(activityId)
        const firestoreSnap = await firestoreRef.get()
        hasFirestore = firestoreSnap.exists
      }
    } catch (fsErr) {
      console.warn('Failed to check Firestore for suspicious activity:', fsErr)
    }

    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from('suspicious_activities')
      .update({
        reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        action_taken: actionTaken || null,
      })
      .eq('id', activityId)

    if (hasFirestore) {
      try {
        const firestoreRef = adminDb.collection('suspicious_activities').doc(activityId)
        await firestoreRef.update({
          reviewed: true,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          action_taken: actionTaken || null,
        })
      } catch (fsErr) {
        console.warn('Failed to update Firestore suspicious activity:', fsErr)
      }
    }

    if (updateError && !hasFirestore) {
      console.error('Error updating suspicious activity:', updateError)
      return adminError('Failed to update activity', 500)
    }

    await logAdminAction({
      action: 'suspicious_activity.review',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'suspicious_activity',
      resourceId: activityId,
      details: { activityId, actionTaken: actionTaken || null },
    })

    return adminOk({ success: true })
  } catch (error) {
    console.error('Error in PATCH suspicious activities:', error)
    return adminError('Internal server error', 500)
  }
}
