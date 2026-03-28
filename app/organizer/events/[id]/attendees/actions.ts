'use server'

import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { generateTicketQRCode } from '@/lib/qrcode'
import { processStripeRefund, processMonCashRefund } from '@/lib/refunds'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Helper: verify the current user is an organizer and owns the given event.
// Returns { user, error } — callers must bail out early on error.
// ---------------------------------------------------------------------------
async function requireEventOwner(eventId: string) {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: 'Not authenticated' }
  if (user.role !== 'organizer' && user.role !== 'admin' && user.role !== 'super_admin') {
    return { user: null, error: 'Organizer access required' }
  }

  // Admins may act on any event; organizers must own it.
  if (user.role === 'organizer') {
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    if (!eventDoc.exists) return { user: null, error: 'Event not found' }
    const eventData = eventDoc.data()
    if (eventData?.organizer_id !== user.id) {
      return { user: null, error: 'You do not own this event' }
    }
  }

  return { user, error: null }
}

export async function resendTicketEmail(ticketId: string, eventId: string) {
  const { user, error: authError } = await requireEventOwner(eventId)
  if (authError || !user) return { success: false, error: authError || 'Unauthorized' }

  try {
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get()

    if (!ticketDoc.exists) {
      return { success: false, error: 'Ticket not found' }
    }

    const ticketData = ticketDoc.data()!

    // Verify ticket belongs to this event
    const ticketEventId = ticketData.event_id || ticketData.eventId
    if (ticketEventId !== eventId) {
      return { success: false, error: 'Ticket does not belong to this event' }
    }

    // Fetch attendee + event to construct the email
    const attendeeId = ticketData.attendee_id
    if (!attendeeId) {
      return { success: false, error: 'Ticket has no attendee' }
    }

    const [attendeeDoc, eventDoc] = await Promise.all([
      adminDb.collection('users').doc(attendeeId).get(),
      adminDb.collection('events').doc(eventId).get(),
    ])

    if (!attendeeDoc.exists || !eventDoc.exists) {
      return { success: false, error: 'Could not load attendee or event data' }
    }

    const attendee = attendeeDoc.data()!
    const event = eventDoc.data()!

    const eventDate = event.start_datetime?.toDate
      ? event.start_datetime.toDate()
      : new Date(event.start_datetime)
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    })

    const qrPayload = String(ticketData.qr_code_data || ticketData.qr_code || ticketDoc.id)
    const qrCodeDataURL = await generateTicketQRCode(qrPayload)

    const html = getTicketConfirmationEmail({
      attendeeName: attendee.full_name || 'Guest',
      eventTitle: event.title,
      eventDate: `${formattedDate} • ${formattedTime}`,
      eventVenue: `${event.venue_name || ''}, ${event.city || ''}`,
      ticketId: ticketDoc.id,
      qrCodeDataURL,
      ticketTier: ticketData.ticket_type,
      ticketPrice: ticketData.price_paid,
      currency: ticketData.currency,
    })

    const result = await sendEmail({
      to: attendee.email,
      subject: `Your ticket for ${event.title}`,
      html,
    })

    if (!result.success) {
      console.error('Error sending ticket email:', result.error)
      return { success: false, error: 'Failed to send email' }
    }

    await ticketDoc.ref.update({ last_email_sent: new Date() })
    revalidatePath(`/organizer/events/${eventId}/attendees`)
    return { success: true }
  } catch (error) {
    console.error('Error resending ticket:', error)
    return { success: false, error: 'Failed to resend ticket' }
  }
}

export async function refundTicket(ticketId: string, eventId: string) {
  const { user, error: authError } = await requireEventOwner(eventId)
  if (authError || !user) return { success: false, error: authError || 'Unauthorized' }

  try {
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get()

    if (!ticketDoc.exists) {
      return { success: false, error: 'Ticket not found' }
    }

    const ticketData = ticketDoc.data()!

    // Verify ticket belongs to this event
    const ticketEventId = ticketData.event_id || ticketData.eventId
    if (ticketEventId !== eventId) {
      return { success: false, error: 'Ticket does not belong to this event' }
    }

    if (ticketData.status === 'refunded') {
      return { success: false, error: 'Ticket already refunded' }
    }

    if (ticketData.checked_in_at || ticketData.checked_in) {
      return { success: false, error: 'Cannot refund a checked-in ticket' }
    }

    // Attempt payment processor refund first
    const paymentMethod = ticketData.payment_method as string | undefined
    const paymentId = (ticketData.payment_id || ticketData.payment_intent_id) as string | undefined

    if (paymentMethod === 'stripe' || paymentMethod === 'stripe_connect') {
      if (!paymentId) {
        return { success: false, error: 'No payment ID found for this ticket — cannot issue Stripe refund' }
      }
      const stripeResult = await processStripeRefund(paymentId)
      if (!stripeResult.success) {
        return { success: false, error: stripeResult.error || 'Stripe refund failed' }
      }
    } else if (paymentMethod === 'moncash' || paymentMethod === 'moncash_button') {
      const moncashResult = await processMonCashRefund(paymentId || '', ticketData.price_paid || 0)
      // MonCash refunds are always manual — we surface the note but continue
      if (!moncashResult.success) {
        return { success: false, error: moncashResult.error || 'MonCash refund failed' }
      }
    }
    // Free tickets or unknown payment methods: no refund call needed

    await ticketDoc.ref.update({
      status: 'refunded',
      refunded_at: new Date(),
      updated_at: new Date(),
    })

    revalidatePath(`/organizer/events/${eventId}/attendees`)
    return { success: true }
  } catch (error) {
    console.error('Error refunding ticket:', error)
    return { success: false, error: 'Failed to refund ticket' }
  }
}

export async function cancelTicket(ticketId: string, eventId: string) {
  const { user, error: authError } = await requireEventOwner(eventId)
  if (authError || !user) return { success: false, error: authError || 'Unauthorized' }

  try {
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get()

    if (!ticketDoc.exists) {
      return { success: false, error: 'Ticket not found' }
    }

    const ticketData = ticketDoc.data()!

    // Verify ticket belongs to this event
    const ticketEventId = ticketData.event_id || ticketData.eventId
    if (ticketEventId !== eventId) {
      return { success: false, error: 'Ticket does not belong to this event' }
    }

    await ticketDoc.ref.update({
      status: 'cancelled',
      cancelled_at: new Date(),
      updated_at: new Date(),
    })

    revalidatePath(`/organizer/events/${eventId}/attendees`)
    return { success: true }
  } catch (error) {
    console.error('Error cancelling ticket:', error)
    return { success: false, error: 'Failed to cancel ticket' }
  }
}
