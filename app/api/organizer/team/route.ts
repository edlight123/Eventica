import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Organization-level team management (distinct from per-event staff).
 * Team members belong to the organizer's org (organizers/{orgId}/team) and hold
 * an org ROLE: 'admin' (manage team + all events), 'manager' (manage events +
 * tasks), or 'staff' (baseline; still needs per-event access to scan).
 *
 * Only the org OWNER (organizerId === caller uid) may manage their own team.
 * All access goes through this server route (Admin SDK); the org subcollections
 * are not client-writable.
 */

const VALID_ROLES = new Set(['admin', 'manager', 'staff'])

function teamCol(orgId: string) {
  return adminDb.collection('organizers').doc(orgId).collection('team')
}

async function requireOrganizer() {
  const { user, error } = await requireAuth()
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'organizer' && user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Organizer access required' }, { status: 403 }) }
  }
  return { user }
}

// GET — list the caller's org team.
export async function GET() {
  const auth = await requireOrganizer()
  if (auth.error) return auth.error
  const orgId = auth.user!.id
  try {
    const snap = await teamCol(orgId).orderBy('joined_at', 'desc').get().catch(async () => {
      // orderBy fails if some docs lack joined_at — fall back to unordered.
      return teamCol(orgId).get()
    })
    const members = snap.docs.map((d: any) => ({ id: d.id, ...d.data(), joined_at: d.data()?.joined_at?.toDate?.()?.toISOString?.() ?? d.data()?.joined_at ?? null }))
    return NextResponse.json({ members })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load team' }, { status: 500 })
  }
}

// POST — add a team member by email (resolves to a uid when the user exists).
export async function POST(request: NextRequest) {
  const auth = await requireOrganizer()
  if (auth.error) return auth.error
  const orgId = auth.user!.id
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || '').trim().toLowerCase()
    const name = String(body?.name || '').trim()
    const role = String(body?.role || 'staff')
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    if (!VALID_ROLES.has(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

    // Resolve to a Firebase user if one exists (so the doc is keyed by uid and
    // can later gate board access); otherwise store as an invited member.
    let uid: string | null = null
    try {
      const rec = await adminAuth.getUserByEmail(email)
      uid = rec.uid
    } catch {
      uid = null
    }
    if (uid === orgId) {
      return NextResponse.json({ error: 'You are the owner of this org' }, { status: 400 })
    }

    const docId = uid || teamCol(orgId).doc().id
    await teamCol(orgId).doc(docId).set(
      {
        uid: uid || null,
        email,
        name: name || null,
        role,
        status: uid ? 'active' : 'invited',
        added_by: orgId,
        joined_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    return NextResponse.json({ success: true, id: docId, status: uid ? 'active' : 'invited' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to add team member' }, { status: 500 })
  }
}

// PATCH — change a member's role.
export async function PATCH(request: NextRequest) {
  const auth = await requireOrganizer()
  if (auth.error) return auth.error
  const orgId = auth.user!.id
  try {
    const body = await request.json().catch(() => ({}))
    const memberId = String(body?.memberId || '')
    const role = String(body?.role || '')
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    if (!VALID_ROLES.has(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

    const ref = teamCol(orgId).doc(memberId)
    if (!(await ref.get()).exists) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    await ref.set({ role, updated_at: FieldValue.serverTimestamp() }, { merge: true })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update role' }, { status: 500 })
  }
}

// DELETE — remove a member (?memberId=).
export async function DELETE(request: NextRequest) {
  const auth = await requireOrganizer()
  if (auth.error) return auth.error
  const orgId = auth.user!.id
  try {
    const memberId = new URL(request.url).searchParams.get('memberId') || ''
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    await teamCol(orgId).doc(memberId).delete()
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to remove member' }, { status: 500 })
  }
}
