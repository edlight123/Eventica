import { getServerSession } from '@/lib/firebase/server'
import { adminDb } from '@/lib/firebase/admin'
import { UserRole } from '@/types/database'
import { isDemoMode } from '@/lib/demo'
import { cookies } from 'next/headers'
import { isAdmin as isAdminEmail } from '@/lib/admin'

function hasFirestoreAdmin(db: any): db is { collection: (path: string) => any } {
  return Boolean(db && typeof db.collection === 'function')
}

async function getDemoUser() {
  if (!isDemoMode()) return null
  
  // In demo mode, we can't use localStorage on server side
  // So we'll check for a cookie instead
  const cookieStore = await cookies()
  const demoUserCookie = cookieStore.get('demo_user')
  
  if (!demoUserCookie) return null
  
  try {
    return JSON.parse(demoUserCookie.value)
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  // Check for demo user first
  if (isDemoMode()) {
    const demoUser = await getDemoUser()
    if (demoUser) {
      return {
        id: demoUser.id,
        email: demoUser.email,
        full_name: demoUser.email === 'demo-organizer@joineventica.com' ? 'Demo Organizer' : 'Demo Attendee',
        role: demoUser.role as UserRole,
        phone_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }

  const { user, error } = await getServerSession()
  
  if (error || !user) {
    return null
  }

  if (!hasFirestoreAdmin(adminDb)) {
    console.error('[auth] Firebase Admin Firestore not initialized')
    return null
  }

  // Get user profile from Firestore
  let userDoc: any
  try {
    userDoc = await adminDb.collection('users').doc(user.id).get()
  } catch (e) {
    console.error('[auth] Failed to fetch user profile from Firestore', e)
    return null
  }
  
  if (!userDoc.exists) {
    return null
  }

  const userData = userDoc.data()
  
  // Convert Firestore Timestamps to ISO strings to prevent serialization errors
  const created_at = userData?.created_at?.toDate ? userData.created_at.toDate().toISOString() : (userData?.created_at || new Date().toISOString())
  const updated_at = userData?.updated_at?.toDate ? userData.updated_at.toDate().toISOString() : (userData?.updated_at || new Date().toISOString())
  
  const normalizeRole = (value: unknown): UserRole => {
    if (typeof value !== 'string') return 'attendee'

    const raw = value.trim().toLowerCase()
    // Normalize common separators/variants
    const key = raw.replace(/[\s-]+/g, '_')

    if (key === 'admin') return 'admin'
    if (key === 'super_admin' || key === 'superadmin') return 'super_admin'
    if (key === 'organizer') return 'organizer'
    if (key === 'attendee') return 'attendee'

    // Unknown role values should not grant privileges
    return 'attendee'
  }

  const normalizedRole = normalizeRole(userData?.role)
  const verified = Boolean(userData?.is_verified) || userData?.verification_status === 'approved'

  // Option A: auto-upgrade verified users to organizer.
  // This keeps permissions consistent across clients without requiring manual role edits.
  let effectiveRole: UserRole = normalizedRole
  if (verified && normalizedRole === 'attendee') {
    try {
      await adminDb
        .collection('users')
        .doc(user.id)
        .set({ role: 'organizer', updated_at: new Date().toISOString() }, { merge: true })
      effectiveRole = 'organizer'
    } catch (e) {
      console.warn('[auth] Failed to auto-upgrade role to organizer', e)
    }
  }

  return {
    id: userDoc.id,
    email: userData?.email || user.email || '',
    full_name: userData?.full_name || '',
    role: effectiveRole,
    phone_number: userData?.phone_number || null,
    is_verified: userData?.is_verified || false,
    verification_status: userData?.verification_status || 'none',
    created_at,
    updated_at
  } as any
}

export async function requireAuth(requiredRole?: UserRole) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { user: null, error: 'Not authenticated' }
  }

  if (requiredRole && user.role !== requiredRole) {
    // Special case: super_admin can access admin routes
    if (requiredRole === 'admin' && user.role === 'super_admin') {
      return { user, error: null }
    }
    // Bootstrap/override: allow emails in ADMIN_EMAILS to access admin routes
    if (requiredRole === 'admin' && isAdminEmail(user.email)) {
      return { user, error: null }
    }
    return { user: null, error: 'Unauthorized' }
  }

  return { user, error: null }
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  
  if (!user) {
    return { user: null, error: 'Not authenticated' }
  }

  // Canonical model: role-based admin
  const roleIsAdmin = user.role === 'admin' || user.role === 'super_admin'
  // Bootstrap model: allow emails in ADMIN_EMAILS (useful before roles are seeded)
  const emailIsAdmin = isAdminEmail(user.email)

  if (!roleIsAdmin && !emailIsAdmin) {
    return { user: null, error: 'Admin access required' }
  }

  return { user, error: null }
}

export async function isOrganizer() {
  const user = await getCurrentUser()
  return user?.role === 'organizer'
}

export async function isAdmin() {
  const user = await getCurrentUser()
  return Boolean(user && (user.role === 'admin' || user.role === 'super_admin' || isAdminEmail(user.email)))
}
