/**
 * Users Data Layer
 * 
 * Centralized data access for users with proper security and optimization.
 */

import { adminDb } from '@/lib/firebase/admin'
import { db } from '@/lib/firebase/client'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  DocumentSnapshot,
  QueryConstraint,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore'

export interface User {
  id: string
  email: string
  full_name?: string
  phone_number?: string
  role: 'attendee' | 'organizer' | 'admin'
  is_verified: boolean
  verification_status:
    | 'none'
    | 'not_started'
    | 'in_progress'
    | 'pending'
    | 'pending_review'
    | 'in_review'
    | 'changes_requested'
    | 'approved'
    | 'rejected'
  created_at: string
  updated_at: string
  [key: string]: any
}

export interface UserFilters {
  role?: string
  is_verified?: boolean
  verification_status?: string
  search?: string
}

export interface PaginatedUsers {
  data: User[]
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
  total?: number
}

// ============================================================================
// SERVER-SIDE FUNCTIONS (use adminDb)
// ============================================================================

/**
 * Get a single user by ID (server-side)
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get()
    
    if (!userDoc.exists) {
      return null
    }

    const data = userDoc.data()
    return {
      id: userDoc.id,
      ...data,
      created_at: data?.created_at?.toDate?.()?.toISOString() || data?.created_at,
      updated_at: data?.updated_at?.toDate?.()?.toISOString() || data?.updated_at,
    } as User
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

/**
 * Get multiple users by IDs in batch (server-side)
 * More efficient than individual getDoc calls
 */
export async function getUsersByIds(userIds: string[]): Promise<Map<string, User>> {
  try {
    if (userIds.length === 0) return new Map()
    
    // Resolve users by document reference (getAll) rather than a
    // `where('__name__', 'in', batch)` query: filtering on the documentId
    // requires Key values, not bare id strings, so passing plain ids throws
    // "__key__ filter value must be a Key". getAll takes plain refs, has no
    // 10-item cap, and returns missing docs with `exists === false`.
    const userMap = new Map<string, User>()
    const refs = userIds.map((id) => adminDb.collection('users').doc(id))
    const docs = await adminDb.getAll(...refs)

    for (const doc of docs) {
      if (!doc.exists) continue
      const data = doc.data() as any
      userMap.set(doc.id, {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      })
    }

    return userMap
  } catch (error) {
    console.error('Error fetching users by IDs:', error)
    return new Map()
  }
}

/**
 * Get admin users list with pagination and filters (server-side)
 */
export async function getAdminUsers(
  filters: UserFilters = {},
  pageSize: number = 50,
  lastDocument?: DocumentSnapshot
): Promise<PaginatedUsers> {
  try {
    let queryRef = adminDb.collection('users').orderBy('created_at', 'desc')

    // Apply filters
    if (filters.role) {
      queryRef = queryRef.where('role', '==', filters.role) as any
    }

    if (filters.is_verified !== undefined) {
      queryRef = queryRef.where('is_verified', '==', filters.is_verified) as any
    }

    if (filters.verification_status) {
      queryRef = queryRef.where('verification_status', '==', filters.verification_status) as any
    }

    queryRef = queryRef.limit(pageSize + 1) as any

    if (lastDocument) {
      queryRef = queryRef.startAfter(lastDocument) as any
    }

    const snapshot = await queryRef.get()
    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    let users = docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      }
    })

    // Apply search filter in memory
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      users = users.filter((user: User) =>
        user.email?.toLowerCase().includes(searchLower) ||
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.phone_number?.includes(searchLower)
      )
    }

    return {
      data: users,
      lastDoc: hasMore ? docs[docs.length - 1] : null,
      hasMore,
    }
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

/**
 * Get user counts by role (server-side, aggregation)
 */
export async function getUserCounts(): Promise<{
  total: number
  attendees: number
  organizers: number
  admins: number
  verified: number
}> {
  try {
    const [totalSnap, attendeesSnap, organizersSnap, adminsSnap, verifiedSnap] = await Promise.all([
      adminDb.collection('users').count().get(),
      adminDb.collection('users').where('role', '==', 'attendee').count().get(),
      adminDb.collection('users').where('role', '==', 'organizer').count().get(),
      adminDb.collection('users').where('role', '==', 'admin').count().get(),
      adminDb.collection('users').where('is_verified', '==', true).count().get(),
    ])

    return {
      total: totalSnap.data().count,
      attendees: attendeesSnap.data().count,
      organizers: organizersSnap.data().count,
      admins: adminsSnap.data().count,
      verified: verifiedSnap.data().count,
    }
  } catch (error) {
    console.error('Error getting user counts:', error)
    return { total: 0, attendees: 0, organizers: 0, admins: 0, verified: 0 }
  }
}

/**
 * Get verification requests with pagination (server-side, admin only)
 */
export async function getVerificationRequests(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
  pageSize: number = 50,
  lastDocument?: DocumentSnapshot
): Promise<PaginatedUsers> {
  try {
    let queryRef = adminDb.collection('verification_requests')
      .orderBy('submitted_at', 'desc')

    if (status !== 'all') {
      queryRef = queryRef.where('status', '==', status) as any
    }

    queryRef = queryRef.limit(pageSize + 1) as any

    if (lastDocument) {
      queryRef = queryRef.startAfter(lastDocument) as any
    }

    const snapshot = await queryRef.get()
    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    const requests = docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        submitted_at: data.submitted_at?.toDate?.()?.toISOString() || data.submitted_at,
        reviewed_at: data.reviewed_at?.toDate?.()?.toISOString() || data.reviewed_at,
      }
    })

    return {
      data: requests,
      lastDoc: hasMore ? docs[docs.length - 1] : null,
      hasMore,
    }
  } catch (error) {
    console.error('Error fetching verification requests:', error)
    return { data: [], lastDoc: null, hasMore: false }
  }
}

// ============================================================================
// CLIENT-SIDE FUNCTIONS (use db)
// ============================================================================

/**
 * Get current user's profile (client-side)
 */
export async function getCurrentUserProfile(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    
    if (!userDoc.exists()) {
      return null
    }

    const data = userDoc.data()
    return {
      id: userDoc.id,
      ...data,
      created_at: data.created_at instanceof Timestamp 
        ? data.created_at.toDate().toISOString() 
        : data.created_at,
      updated_at: data.updated_at instanceof Timestamp 
        ? data.updated_at.toDate().toISOString() 
        : data.updated_at,
    } as User
  } catch (error) {
    console.error('Error fetching user profile (client):', error)
    return null
  }
}
