/**
 * Firestore Admin Helper
 * Server-side Firestore utilities for admin operations
 */

import { adminDb } from '@/lib/firebase/admin'
import { FieldPath } from 'firebase-admin/firestore'

/**
 * Get aggregate count for a collection
 */
export async function getCollectionCount(collectionName: string, whereClause?: { field: string; op: any; value: any }): Promise<number> {
  try {
    let query = adminDb.collection(collectionName)
    
    if (whereClause) {
      query = query.where(whereClause.field, whereClause.op, whereClause.value) as any
    }
    
    const aggregateQuery = query.count()
    const snapshot = await aggregateQuery.get()
    return snapshot.data().count || 0
  } catch (error) {
    console.error(`Error getting count for ${collectionName}:`, error)
    // If collection doesn't exist or error occurs, return 0
    return 0
  }
}

/**
 * Get platform stats counts
 */
export async function getPlatformCounts() {
  // Pending verifications (support both legacy and canonical statuses)
  let pendingVerifications = 0
  let pendingBankVerifications = 0
  const pendingStatuses = ['pending_review', 'in_review', 'pending']
  try {
    // Prefer an indexed query (avoids scanning the entire collection)
    const pendingCountSnap = await adminDb
      .collection('verification_requests')
      .where('status', 'in', pendingStatuses)
      .count()
      .get()
    pendingVerifications = pendingCountSnap.data().count || 0
  } catch (error) {
    console.warn('Falling back to full scan for pending verifications count:', error)
    const verificationsSnapshot = await adminDb
      .collection('verification_requests')
      .get()
    pendingVerifications = verificationsSnapshot.docs.filter((doc: any) => {
      const status = doc.data().status
      return status === 'pending_review' || status === 'in_review' || status === 'pending'
    }).length
  }

  // Pending bank verifications (Haiti bank accounts)
  try {
    const pendingBankCountSnap = await adminDb
      .collectionGroup('verificationDocuments')
      .where('type', '==', 'bank')
      .where('status', '==', 'pending')
      .count()
      .get()
    pendingBankVerifications = pendingBankCountSnap.data().count || 0
  } catch (error) {
    console.warn('Falling back to limited scan for pending bank verifications count:', error)
    // Fallback (best-effort): scan organizers list and count pending bank verification docs.
    try {
      const usersSnapshot = await adminDb.collection('users').where('role', '==', 'organizer').get()
      let count = 0
      for (const userDoc of usersSnapshot.docs) {
        const organizerId = userDoc.id
        const snap = await adminDb
          .collection('organizers')
          .doc(organizerId)
          .collection('verificationDocuments')
          .where('type', '==', 'bank')
          .where('status', '==', 'pending')
          .get()
        count += snap.size
      }
      pendingBankVerifications = count
    } catch {
      pendingBankVerifications = 0
    }
  }

  const [usersCount, eventsCount, ticketsCount] = await Promise.all([
    getCollectionCount('users'),
    getCollectionCount('events'),
    getCollectionCount('tickets')
  ])

  return {
    usersCount,
    eventsCount,
    ticketsCount,
    pendingVerifications,
    pendingBankVerifications
  }
}

/**
 * Get 7-day metrics from daily rollups
 * Returns GMV, tickets sold, and refunds for the last 7 days
 */
export async function get7DayMetrics(): Promise<{ 
  gmv7d: number
  tickets7d: number
  refunds7d: number
  refundsAmount7d: number
}> {
  try {
    const today = new Date()
    const dates: string[] = []
    
    // Generate last 7 days in YYYY-MM-DD format
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dates.push(dateStr)
    }

    // Fetch all 7 days in parallel
    const statsPromises = dates.map(date => 
      adminDb.collection('platform_stats_daily').doc(date).get()
    )
    
    const statsDocs = await Promise.all(statsPromises)
    
    let gmv7d = 0
    let tickets7d = 0
    let refunds7d = 0
    let refundsAmount7d = 0
    
    statsDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data()
        gmv7d += data?.gmvConfirmed || 0
        tickets7d += data?.ticketsConfirmed || 0
        refunds7d += data?.refundsCount || 0
        refundsAmount7d += data?.refundsAmount || 0
      }
    })

    return { gmv7d, tickets7d, refunds7d, refundsAmount7d }
  } catch (error) {
    console.error('Error fetching 7-day metrics:', error)
    // If rollups don't exist yet, return 0
    return { gmv7d: 0, tickets7d: 0, refunds7d: 0, refundsAmount7d: 0 }
  }
}

/**
 * Get recent events ordered by createdAt
 */
export async function getRecentEvents(limit: number = 8) {
  try {
    // Try createdAt first (camelCase), fall back to created_at (snake_case)
    let eventsSnapshot: any
    const poolLimit = Math.max(limit, Math.min(100, limit * 10))
    try {
      eventsSnapshot = await adminDb
        .collection('events')
        .orderBy('createdAt', 'desc')
        .limit(poolLimit)
        .get()
    } catch (error) {
      // If createdAt doesn't exist, try created_at
      console.log('Trying created_at field instead of createdAt')
      eventsSnapshot = await adminDb
        .collection('events')
        .orderBy('created_at', 'desc')
        .limit(poolLimit)
        .get()
    }

    const isTrueish = (value: unknown): boolean => {
      if (value === true) return true
      if (value === false || value === null || value === undefined) return false
      if (typeof value === 'number') return value === 1
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase()
        return v === 'true' || v === '1' || v === 'yes'
      }
      return false
    }

    const normalized = eventsSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      
      const legacyStatus = String(data?.status || '').trim().toLowerCase()
      const isPublished =
        isTrueish(data?.isPublished) ||
        isTrueish(data?.is_published) ||
        legacyStatus === 'published'

      // Safe date conversion helper
      const toISOSafe = (dateValue: any): string => {
        try {
          if (!dateValue) return new Date().toISOString()
          if (dateValue.toDate) return dateValue.toDate().toISOString()
          if (typeof dateValue === 'string') return new Date(dateValue).toISOString()
          if (dateValue instanceof Date) return dateValue.toISOString()
          return new Date().toISOString()
        } catch (error) {
          console.error('Date conversion error:', error, dateValue)
          return new Date().toISOString()
        }
      }
      
      // Robust location extraction: events may store location either as flat
      // fields (snake_case from the form, or camelCase) or under a nested
      // `location` object. Online events have no venue.
      const isOnline = isTrueish(data?.is_online) || isTrueish(data?.isOnline)
      const loc =
        data?.location && typeof data.location === 'object' ? data.location : {}

      const venueName =
        data.venueName || data.venue_name || loc.venueName || loc.venue_name || loc.name || ''
      const address =
        data.address || data.venue_address || data.venueAddress || loc.address || ''
      const commune =
        data.commune || loc.commune || data.quartier || loc.quartier || ''
      const city = data.city || loc.city || data.town || loc.town || ''

      const locationParts: string[] = []
      if (venueName) locationParts.push(venueName)
      if (commune && commune.toLowerCase() !== city.toLowerCase()) locationParts.push(commune)
      if (city) locationParts.push(city)

      let locationLabel = ''
      if (isOnline) locationLabel = 'Online'
      else if (locationParts.length > 0) locationLabel = locationParts.join(', ')
      else if (address) locationLabel = address

      return {
        id: doc.id,
        title: data.title || 'Untitled Event',
        startDateTime: toISOSafe(data.startDateTime || data.start_datetime),
        ticketPrice: data.ticketPrice || data.ticket_price || data.price || 0,
        currency: data.currency || 'HTG',
        createdAt: toISOSafe(data.createdAt || data.created_at),
        isPublished,
        isOnline,
        city,
        commune,
        venueName,
        locationLabel,
        organizerId: data.organizerId || data.organizer_id
      }
    })

    const published = normalized.filter((e: any) => e.isPublished)
    const drafts = normalized.filter((e: any) => !e.isPublished)
    return published.concat(drafts).slice(0, limit)
  } catch (error) {
    console.error('Error fetching recent events:', error)
    return []
  }
}

/**
 * Get pending verification requests (top N)
 */
export async function getPendingVerifications(limit: number = 3) {
  try {
    const pendingStatuses = ['pending_review', 'in_review', 'pending']
    let pendingDocs: any[] = []
    try {
      // Prefer a query; fallback to scan if index/query isn't available.
      const snap = await adminDb
        .collection('verification_requests')
        .where('status', 'in', pendingStatuses)
        .get()
      pendingDocs = snap.docs
    } catch (error) {
      console.warn('Falling back to full scan for pending verifications list:', error)
      const verificationsSnapshot = await adminDb
        .collection('verification_requests')
        .get()
      pendingDocs = verificationsSnapshot.docs.filter((doc: any) => {
        const status = doc.data().status
        return status === 'pending_review' || status === 'in_review' || status === 'pending'
      })
    }

    pendingDocs = pendingDocs
      .sort((a: any, b: any) => {
        const aDate = a.data().created_at?.toDate?.() || a.data().createdAt?.toDate?.() || new Date(0)
        const bDate = b.data().created_at?.toDate?.() || b.data().createdAt?.toDate?.() || new Date(0)
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, limit)

    return pendingDocs.map((doc: any) => {
      const data = doc.data()
      
      // Handle both old and new formats for timestamps
      let createdAt
      if (data.submittedAt?._seconds) {
        createdAt = new Date(data.submittedAt._seconds * 1000).toISOString()
      } else if (data.createdAt?._seconds) {
        createdAt = new Date(data.createdAt._seconds * 1000).toISOString()
      } else if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate().toISOString()
      } else if (data.created_at?.toDate) {
        createdAt = data.created_at.toDate().toISOString()
      } else {
        createdAt = new Date(data.created_at || data.createdAt || Date.now()).toISOString()
      }
      
      // Extract business name from nested format or direct field
      const businessName = data.businessName 
        || data.business_name 
        || data.steps?.organizerInfo?.fields?.organization_name
        || data.steps?.organizerInfo?.fields?.full_name
      
      return {
        id: doc.id,
        userId: data.userId || data.user_id || doc.id,
        businessName,
        status: data.status,
        createdAt,
        idType: data.idType || data.id_type || 'Government ID'
      }
    })
  } catch (error) {
    console.error('Error fetching pending verifications:', error)
    return []
  }
}

/**
 * Search across events, users, and orders
 */
export async function globalSearch(query: string) {
  if (!query || query.trim().length < 2) {
    return { events: [], users: [], orders: [] }
  }

  const searchTerm = query.toLowerCase().trim()

  try {
    // Search events by title
    const eventsSnapshot = await adminDb
      .collection('events')
      .orderBy('title')
      .limit(10)
      .get()

    const events = eventsSnapshot.docs
      .map((doc: any) => {
        const data = doc.data()
        const startDateTime = data.startDateTime || data.start_datetime
        return {
          id: doc.id,
          title: data.title,
          startDateTime: startDateTime?.toDate ? startDateTime.toDate().toISOString() : startDateTime,
          ticketPrice: data.ticketPrice || data.ticket_price || data.price,
          currency: data.currency,
          city: data.city,
          commune: data.commune,
          venueName: data.venueName || data.venue_name,
          status: data.status,
          isPublished: data.isPublished ?? data.is_published
        }
      })
      .filter((event: any) => 
        event.title?.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5)

    // Search users by email (limited for privacy)
    const usersSnapshot = await adminDb
      .collection('users')
      .orderBy('email')
      .limit(10)
      .get()

    const users = usersSnapshot.docs
      .map((doc: any) => {
        const data = doc.data()
        return {
          id: doc.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          is_verified: data.is_verified
        }
      })
      .filter((user: any) => 
        user.email?.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5)

    return { events, users, orders: [] }
  } catch (error) {
    console.error('Error in global search:', error)
    return { events: [], users: [], orders: [] }
  }
}
