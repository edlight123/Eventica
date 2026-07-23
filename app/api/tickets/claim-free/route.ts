import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { notifyTicketPurchase, notifyOrganizerTicketSale } from '@/lib/notifications/helpers'
import { hasEventAccess } from '@/lib/events/access-guard'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    console.log('=== CLAIM FREE TICKET ===')
    console.log('User:', user?.id, user?.email)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, quantity = 1 } = await request.json()
    console.log('Event ID:', eventId, 'Quantity:', quantity)

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Validate quantity
    const ticketQuantity = Math.min(Math.max(1, quantity), 10) // Max 10 tickets per claim
    console.log('Validated quantity:', ticketQuantity)

    // Fetch event details from Firestore
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    
    console.log('Event fetch result:', { exists: eventDoc.exists, id: eventDoc.id })

    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as any

    // Password-protected events: require a valid access grant before issuing tickets.
    if (!(await hasEventAccess(event, eventId, user.id))) {
      return NextResponse.json({ error: 'access_code_required' }, { status: 403 })
    }

    // Verify event is free
    console.log('Event ticket price:', event.ticket_price)
    if (event.ticket_price && event.ticket_price > 0) {
      return NextResponse.json({ error: 'This is not a free event' }, { status: 400 })
    }

    // Check if tickets are still available
    const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0)
    console.log('Remaining tickets:', remainingTickets, 'Requested:', ticketQuantity)
    
    if (remainingTickets <= 0) {
      return NextResponse.json({ error: 'No tickets available' }, { status: 400 })
    }

    if (remainingTickets < ticketQuantity) {
      return NextResponse.json({ 
        error: `Only ${remainingTickets} ticket${remainingTickets !== 1 ? 's' : ''} remaining` 
      }, { status: 400 })
    }

    // Create tickets one at a time to ensure each gets a unique ID
    const createdTickets = []
    for (let i = 0; i < ticketQuantity; i++) {
      const ticketData = {
        event_id: eventId,
        attendee_id: user.id,
        attendee_name: user.full_name || user.email || 'Guest',
        status: 'valid',
        price_paid: 0,
        purchased_at: FieldValue.serverTimestamp(),
        tier_name: 'General Admission',
        // Include event date fields for scanner
        start_datetime: event.start_datetime || null,
        end_datetime: event.end_datetime || null,
        event_date: event.start_datetime || null,
        venue_name: event.venue_name || null,
        city: event.city || null,
      }
      
      const ticketRef = await adminDb.collection('tickets').add(ticketData)
      
      // Now update with QR code data using the actual ticket ID
      await ticketRef.update({ qr_code_data: ticketRef.id })
      
      const createdTicketDoc = await ticketRef.get()
      const createdTicket = { id: createdTicketDoc.id, ...createdTicketDoc.data() }
      createdTickets.push(createdTicket)
      console.log('Created ticket:', createdTicket.id, 'with QR:', createdTicket.id)
    }
    
    console.log('Created tickets:', createdTickets.length)

    // Update tickets_sold count in Firestore using increment
    await adminDb
      .collection('events')
      .doc(eventId)
      .update({ 
        tickets_sold: FieldValue.increment(ticketQuantity)
      })
      
    console.log(`✅ Incremented tickets_sold for event ${eventId} by ${ticketQuantity}`)

    // Send in-app notification for free ticket claim
    try {
      await notifyTicketPurchase(
        user.id,
        eventId,
        event.title,
        ticketQuantity
      )
      
      // Notify organizer
      await notifyOrganizerTicketSale(
        event.organizer_id,
        eventId,
        event.title,
        ticketQuantity,
        0, // free event
        user.full_name
      )
    } catch (error) {
      console.error('Failed to send notification:', error)
      // Don't fail the claim if notification fails
    }

    console.log('=== SUCCESS ===')
    return NextResponse.json({ 
      success: true, 
      tickets: createdTickets,
      count: ticketQuantity,
      message: `${ticketQuantity} free ticket${ticketQuantity !== 1 ? 's' : ''} claimed successfully!`
    })
  } catch (error: any) {
    console.error('Claim free ticket error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to claim free ticket' },
      { status: 500 }
    )
  }
}
