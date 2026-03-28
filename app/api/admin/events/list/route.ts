import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tab, filters, searchQuery } = await request.json()

    // Build Firestore query
    let query = adminDb.collection('events')

    // Apply filters
    if (filters.city) {
      query = query.where('city', '==', filters.city)
    }

    if (filters.category) {
      query = query.where('category', '==', filters.category)
    }

    // Sort
    if (filters.sortBy === 'newest') {
      query = query.orderBy('created_at', 'desc')
    } else if (filters.sortBy === 'soonest') {
      query = query.orderBy('start_datetime', 'asc')
    }

    // Limit results
    query = query.limit(100)

    const snapshot = await query.get()

    // Get all organizer IDs
    const organizerIdsSet = new Set<string>()
    snapshot.docs.forEach((doc: any) => {
      const orgId = doc.data().organizer_id
      if (orgId) organizerIdsSet.add(orgId)
    })
    const organizerIds = Array.from(organizerIdsSet)

    // Fetch organizers (only if we have IDs)
    let organizersSnapshot
    if (organizerIds.length > 0) {
      // Firestore 'in' operator supports max 10 values, so batch if needed
      const batches = []
      for (let i = 0; i < organizerIds.length; i += 10) {
        const batch = organizerIds.slice(i, i + 10)
        batches.push(
          adminDb.collection('users').where('__name__', 'in', batch).get()
        )
      }
      const results = await Promise.all(batches)
      organizersSnapshot = { docs: results.flatMap(r => r.docs) }
    } else {
      organizersSnapshot = { docs: [] }
    }

    const organizersMap = new Map()
    organizersSnapshot.docs.forEach((doc: any) => {
      const data = doc.data()
      organizersMap.set(doc.id, {
        id: doc.id,
        name: data.full_name || data.email || 'Unknown',
        email: data.email,
        verified: data.verified || false
      })
    })

    // Fetch tickets count for each event
    const eventsWithData = await Promise.all(
      snapshot.docs.map(async (doc: any) => {
        const data = doc.data()
        const organizer = organizersMap.get(data.organizer_id) || {
          name: 'Unknown',
          email: '',
          verified: false
        }

        // Get ticket count
        const ticketsSnapshot = await adminDb
          .collection('tickets')
          .where('event_id', '==', doc.id)
          .where('status', '!=', 'cancelled')
          .get()

        // Get report count (gracefully returns 0 if collection doesn't exist yet)
        let reports_count = 0
        try {
          const reportsSnap = await adminDb
            .collection('event_reports')
            .where('event_id', '==', doc.id)
            .count()
            .get()
          reports_count = reportsSnap.data().count || 0
        } catch {
          reports_count = 0
        }

        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          start_datetime: data.start_datetime?.toDate?.()?.toISOString() || data.start_datetime,
          end_datetime: data.end_datetime?.toDate?.()?.toISOString() || data.end_datetime,
          city: data.city || '',
          venue_name: data.venue_name,
          address: data.venue_address || data.address,
          banner_image_url: data.banner_image || data.banner_image_url,
          category: data.category,
          is_published: data.is_published || false,
          max_attendees: data.max_attendees || 0,
          organizer_id: data.organizer_id,
          organizer_name: organizer.name,
          organizer_email: organizer.email,
          organizer_verified: organizer.verified,
          tickets_sold: ticketsSnapshot.size,
          reports_count,
          rejected: data.rejected || false
        }
      })
    )

    // Apply search filter in memory
    let filteredEvents = eventsWithData
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredEvents = eventsWithData.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.city.toLowerCase().includes(query) ||
        event.organizer_name.toLowerCase().includes(query) ||
        event.organizer_email.toLowerCase().includes(query)
      )
    }

    // Apply price filter in memory
    // Note: This would need ticket_tiers data for accurate filtering
    
    return NextResponse.json({ events: filteredEvents })
  } catch (error) {
    console.error('Error listing events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
