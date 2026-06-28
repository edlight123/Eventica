import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { adminDb } from '@/lib/firebase/admin'
import OrganizerDetailsClient from './OrganizerDetailsClient'


function serializeFirestoreValue(value: any): any {
  if (value === null || value === undefined) return value

  // Firestore Timestamp (firebase-admin)
  if (typeof value?.toDate === 'function') {
    try {
      const d: any = value.toDate()
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString()
    } catch {
      // fall through
    }
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((v) => serializeFirestoreValue(v))
  }

  if (typeof value === 'object') {
    // Firestore DocumentReference-ish
    if (typeof (value as any)?.path === 'string') {
      return (value as any).path
    }

    // Firestore GeoPoint-ish
    if (typeof (value as any)?.latitude === 'number' && typeof (value as any)?.longitude === 'number') {
      return { latitude: (value as any).latitude, longitude: (value as any).longitude }
    }

    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeFirestoreValue(v)
    }
    return out
  }

  return value
}

async function getOrganizerDetails(organizerId: string) {
  try {
    // Get user data
    const userDoc = await adminDb.collection('users').doc(organizerId).get()
    if (!userDoc.exists) {
      return null
    }

    const userData = serializeFirestoreValue(userDoc.data())

    // Get organizer profile data
    const organizerDoc = await adminDb.collection('organizers').doc(organizerId).get()
    const organizerData = organizerDoc.exists ? serializeFirestoreValue(organizerDoc.data()) : null

    // Get payout config
    const payoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()
    const payoutConfig = payoutConfigDoc.exists ? serializeFirestoreValue(payoutConfigDoc.data()) : null

    // Get all payout destinations (multiple bank accounts)
    const destinationsSnapshot = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutDestinations')
      .get()
    
    const payoutDestinations: any[] = []
    destinationsSnapshot.docs.forEach((doc: any) => {
      const data = serializeFirestoreValue(doc.data())
      payoutDestinations.push({
        id: doc.id,
        ...data
      })
    })

    // Get verification request
    const verificationRequestDoc = await adminDb
      .collection('verification_requests')
      .doc(organizerId)
      .get()
    const verificationRequest = verificationRequestDoc.exists ? serializeFirestoreValue(verificationRequestDoc.data()) : null

    // Get verification documents - only top-level docs (identity, bank, phone)
    const verificationDocsSnapshot = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('verificationDocuments')
      .get()
    
    const verificationDocs: any[] = []
    verificationDocsSnapshot.docs.forEach((doc: any) => {
      const docId = doc.id
      // Only include main verification types, skip nested bank verification docs
      if (['identity', 'bank', 'phone'].includes(docId)) {
        const data = serializeFirestoreValue(doc.data())
        // Ensure type is always a string, not an object
        if (data && typeof data.type === 'object') {
          data.type = JSON.stringify(data.type)
        }
        verificationDocs.push({
          id: docId,
          ...data
        })
      }
    })

    // Get organizer's events count
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .count()
      .get()
    const eventsCount = eventsSnapshot.data().count

    // Get published events count
    const publishedEventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .where('status', '==', 'published')
      .count()
      .get()
    const publishedEventsCount = publishedEventsSnapshot.data().count

    // Get ticket sales count - tickets are linked to events, not directly to organizers
    // First get all event IDs for this organizer
    const eventsForTicketsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .select() // Only get IDs, no data needed
      .get()
    
    let ticketsCount = 0
    const eventIds = eventsForTicketsSnapshot.docs.map((doc: any) => doc.id)
    
    if (eventIds.length > 0) {
      // Process in batches of 10 (Firestore 'in' query limit)
      for (let i = 0; i < eventIds.length; i += 10) {
        const batch = eventIds.slice(i, i + 10)
        const ticketsBatchSnapshot = await adminDb
          .collection('tickets')
          .where('event_id', 'in', batch)
          .where('status', '==', 'confirmed')
          .count()
          .get()
        ticketsCount += ticketsBatchSnapshot.data().count
      }
    }

    return {
      id: organizerId,
      user: userData,
      organizer: organizerData,
      payoutConfig,
      payoutDestinations,
      verificationRequest,
      verificationDocs,
      stats: {
        totalEvents: eventsCount,
        publishedEvents: publishedEventsCount,
        ticketsSold: ticketsCount,
      }
    }
  } catch (error) {
    console.error('Error fetching organizer details:', error)
    return null
  }
}

export default async function OrganizerDetailPage({ params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin()
  
  if (error || !user) {
    redirect('/')
  }

  const organizerDetails = await getOrganizerDetails(params.id)

  if (!organizerDetails) {
    redirect('/admin/organizers')
  }

  return (
    <OrganizerDetailsClient organizerDetails={organizerDetails} />
  )
}
