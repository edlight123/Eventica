import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { generateTicketQRCode } from '@/lib/qrcode'
import { notifyTicketPurchase, notifyOrganizerTicketSale } from '@/lib/notifications/helpers'
import { FieldValue } from 'firebase-admin/firestore'

// Lazy load Stripe
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment Intent ID is required' }, { status: 400 })
    }

    const stripe = getStripe()

    // Verify payment intent exists and succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Check if tickets already exist for this payment in Firestore
    const existingTicketsSnapshot = await adminDb
      .collection('tickets')
      .where('payment_id', '==', paymentIntentId)
      .limit(1)
      .get()

    if (!existingTicketsSnapshot.empty) {
      console.log('✅ Tickets already exist for payment:', paymentIntentId)
      return NextResponse.json({ 
        success: true, 
        ticketIds: existingTicketsSnapshot.docs.map((doc: any) => doc.id),
        message: 'Tickets already created' 
      })
    }

    // Create tickets
    const quantity = parseInt(paymentIntent.metadata.quantity || '1', 10)
    const pricePerTicket = paymentIntent.amount / 100 / quantity

    // Fetch event details to include in tickets
    const eventDoc = await adminDb.collection('events').doc(paymentIntent.metadata.eventId).get()
    const eventDetails = eventDoc.exists ? eventDoc.data() : null
    
    // Fetch attendee details for attendee_name
    const attendeeDoc = await adminDb.collection('users').doc(paymentIntent.metadata.userId).get()
    const attendee = attendeeDoc.exists ? attendeeDoc.data() : null

    const createdTickets = []
    for (let i = 0; i < quantity; i++) {
      const eventCurrency = String(paymentIntent.metadata.originalCurrency || '').toUpperCase() || 'USD'
      const priceInOriginalCurrency = Number(paymentIntent.metadata.priceInOriginalCurrency || paymentIntent.metadata.finalPrice || 0)

      const normalizedEventCurrency = (() => {
        const upper = String(eventCurrency || '').toUpperCase()
        if (upper === 'HTG') return 'HTG'
        if (upper === 'CAD') return 'CAD'
        return 'USD'
      })()

      const ticketData = {
        event_id: paymentIntent.metadata.eventId,
        attendee_id: paymentIntent.metadata.userId,
        attendee_name: attendee?.full_name || attendee?.email || 'Guest',
        // Organizer-facing/event-currency amount.
        price_paid: Number.isFinite(priceInOriginalCurrency) && priceInOriginalCurrency > 0 ? priceInOriginalCurrency : pricePerTicket,
        currency: normalizedEventCurrency,
        original_currency: normalizedEventCurrency,
        // When conversion occurs, this is the settlement-per-event rate (e.g., USD per HTG for Stripe).
        exchange_rate_used: paymentIntent.metadata.exchangeRate ? parseFloat(paymentIntent.metadata.exchangeRate) : null,
        // Admin/auditing fields (charged/settlement amounts)
        charged_amount: pricePerTicket,
        charged_currency: String(paymentIntent.currency || 'usd').toUpperCase(),
        payment_method: 'stripe',
        payment_id: paymentIntentId,
        status: 'valid',
        purchased_at: FieldValue.serverTimestamp(),
        // Stamp the exact tier id at issuance for reliable scan-time tier lookup by id.
        tier_id: paymentIntent.metadata.tierId || '',
        tier_name: paymentIntent.metadata.tierName || 'General Admission',
        // Include event date fields for scanner
        start_datetime: eventDetails?.start_datetime || null,
        end_datetime: eventDetails?.end_datetime || null,
        event_date: eventDetails?.start_datetime || null,
        venue_name: eventDetails?.venue_name || null,
        city: eventDetails?.city || null,
      }
      
      const ticketRef = await adminDb.collection('tickets').add(ticketData)
      
      // Now update with QR code data using the actual ticket ID
      await ticketRef.update({ qr_code_data: ticketRef.id })
      
      const createdTicketDoc = await ticketRef.get()
      const createdTicket = { id: createdTicketDoc.id, ...createdTicketDoc.data() }
      
      console.log('=== TICKET CREATION DEBUG ===')
      console.log('Created Ticket ID:', createdTicket.id)
      console.log('Event ID:', createdTicket.event_id)
      console.log('Attendee Name:', createdTicket.attendee_name)
      console.log('Has start_datetime:', !!createdTicket.start_datetime)
      console.log('Has venue_name:', !!createdTicket.venue_name)
      console.log('Full Ticket Data:', JSON.stringify(createdTicket, null, 2))
      console.log('=== END DEBUG ===')
      createdTickets.push(createdTicket)
    }

    if (createdTickets.length === 0) {
      return NextResponse.json({ error: 'Failed to create tickets' }, { status: 500 })
    }

    // Update tickets_sold count in Firestore using increment
    await adminDb
      .collection('events')
      .doc(paymentIntent.metadata.eventId)
      .update({ 
        tickets_sold: FieldValue.increment(quantity)
      })

    console.log(`✅ Incremented tickets_sold for event ${paymentIntent.metadata.eventId} by ${quantity}`)

    // Send notification
    if (eventDetails) {
      try {
        await notifyTicketPurchase(
          paymentIntent.metadata.userId,
          paymentIntent.metadata.eventId,
          eventDetails.title,
          quantity
        )
        
        // Notify organizer about the sale
        await notifyOrganizerTicketSale(
          eventDetails.organizer_id,
          paymentIntent.metadata.eventId,
          eventDetails.title,
          quantity,
          paymentIntent.amount / 100,
          attendee?.full_name
        )
      } catch (error) {
        console.error('Failed to send notification:', error)
      }

      // Send email confirmation
      if (attendee) {
        const firstTicket = createdTickets[0]
        console.log('=== QR CODE GENERATION DEBUG ===')
        console.log('Generating QR for Ticket ID:', firstTicket.id)
        const qrCodeDataURL = await generateTicketQRCode(firstTicket.id)
        console.log('QR Code Generated - Length:', qrCodeDataURL.length)
        console.log('=== END DEBUG ===')

        await sendEmail({
          to: attendee.email,
          subject: `Your ${quantity > 1 ? `${quantity} tickets` : 'ticket'} for ${eventDetails.title}`,
          html: getTicketConfirmationEmail({
            attendeeName: attendee.full_name || 'Guest',
            eventTitle: eventDetails.title,
            eventDate: new Date(eventDetails.start_datetime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            eventVenue: `${eventDetails.venue_name}, ${eventDetails.city}`,
            ticketId: firstTicket.id,
            qrCodeDataURL,
          }),
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      ticketIds: createdTickets.map((t: any) => t.id),
      message: `${createdTickets.length} ticket(s) created successfully` 
    })
  } catch (error: any) {
    console.error('Ticket creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create tickets' },
      { status: 500 }
    )
  }
}
