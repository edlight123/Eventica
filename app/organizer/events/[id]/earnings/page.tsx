import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { adminDb } from '@/lib/firebase/admin'
import { getEventEarnings, getEventTierSalesBreakdown } from '@/lib/earnings'
import { calculateFees } from '@/lib/fees'
import EventEarningsView from './EventEarningsView'
import { isAdmin } from '@/lib/admin'

export const revalidate = 30

export const metadata = {
  title: 'Event Earnings - Eventica',
  description: 'View earnings and request withdrawal for your event'
}

export default async function EventEarningsPage({
  params
}: {
  params: { id: string }
}) {
  const { user, error } = await requireAuth()
  const eventId = params.id

  if (error || !user) {
    redirect(`/auth/login?redirect=/organizer/events/${eventId}/earnings`)
  }

  // Fetch event details
  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) {
    return <div>Event not found</div>
  }

  const eventData = eventDoc.data()

  // Check ownership
  if (eventData?.organizer_id !== user.id) {
    redirect('/organizer')
  }

  // Fetch earnings
  const earnings = await getEventEarnings(eventId)

  const tierBreakdown = await getEventTierSalesBreakdown(eventId)

  // Serialize Firestore timestamps
  const serializeData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj
    if (obj.toDate && typeof obj.toDate === 'function') return obj.toDate().toISOString()
    if (Array.isArray(obj)) return obj.map(serializeData)
    
    const serialized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeData(obj[key])
      }
    }
    return serialized
  }

  const serializedEvent = serializeData({
    id: eventDoc.id,
    ...eventData
  })

  const serializedEarnings = serializeData(earnings)

  return (
    <div className="bg-gray-50">      
      <EventEarningsView
        event={serializedEvent}
        earnings={serializedEarnings}
        organizerId={user.id}
        tierBreakdown={tierBreakdown}
      />    </div>
  )
}
