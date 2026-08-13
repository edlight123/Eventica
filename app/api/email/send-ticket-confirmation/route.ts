// Re-send a ticket confirmation (admin support tool).
//
// TWO things changed here beyond keeping it alive:
//
//  1. The recipient is now resolved FROM THE TICKET, never from the request body. It
//     used to take a `userId` off the body and mail whatever address that user
//     document held — so the caller, not the order, chose who received someone's
//     ticket. The ticket is the order record; it is the only authority for where a
//     confirmation goes.
//  2. It delivers through the same helper every fulfillment path uses
//     (lib/tickets/confirmation.ts), so a resend is byte-identical to the original —
//     including SMS for a guest ticket and WhatsApp for an account one.

import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { sendTicketConfirmation } from '@/lib/tickets/confirmation'
import { guestTokenFor } from '@/lib/guest/identity'

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAdmin()
    if (authError || !user) {
      return Response.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { ticketId } = await request.json()

    if (!ticketId) {
      return Response.json({ error: 'ticketId is required' }, { status: 400 })
    }

    const ticketSnap = await adminDb.collection('tickets').doc(String(ticketId)).get()
    if (!ticketSnap.exists) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 })
    }
    const ticket = { id: ticketSnap.id, ...(ticketSnap.data() as any) }

    const eventSnap = ticket.event_id
      ? await adminDb.collection('events').doc(String(ticket.event_id)).get()
      : null
    if (!eventSnap?.exists) {
      return Response.json({ error: 'Event not found' }, { status: 404 })
    }
    const event = { id: eventSnap.id, ...(eventSnap.data() as any) }

    // WHO the ticket belongs to. A guest ticket carries its own contact details; an
    // account ticket resolves the user document behind `attendee_id`.
    const isGuestTicket = Boolean(ticket.is_guest) || String(ticket.attendee_id || '').startsWith('guest_')

    let recipientEmail: string | null = null
    let recipientName: string | null = null
    let recipientPhone: string | null = null

    if (isGuestTicket) {
      recipientEmail = ticket.guest_email || null
      recipientName = ticket.attendee_name || null
      recipientPhone = ticket.guest_phone || null
    } else if (ticket.attendee_id) {
      const userSnap = await adminDb.collection('users').doc(String(ticket.attendee_id)).get()
      const profile = userSnap.exists ? (userSnap.data() as any) : null
      recipientEmail = profile?.email || null
      recipientName = profile?.full_name || ticket.attendee_name || null
      recipientPhone = profile?.phone || profile?.phone_number || null
    }

    if (!recipientEmail) {
      return Response.json(
        { error: 'This ticket has no email address on record to send to.' },
        { status: 422 }
      )
    }

    // A guest's link is re-derived from the order key on their guest order, not stored
    // and not accepted from the caller.
    let guestToken: string | null = null
    if (isGuestTicket) {
      const orders = await adminDb
        .collection('guest_orders')
        .where('guest_id', '==', String(ticket.attendee_id))
        .limit(1)
        .get()
      if (!orders.empty) guestToken = guestTokenFor(orders.docs[0].id)
    }

    const result = await sendTicketConfirmation({
      ticketId: String(ticket.id),
      qrPayload: ticket.qr_code_data || ticket.id,
      event,
      recipient: {
        email: recipientEmail,
        name: recipientName,
        phone: recipientPhone,
        isGuest: isGuestTicket,
      },
      quantity: 1,
      tierName: ticket.tier_name || ticket.ticket_type || null,
      guestToken,
      logPrefix: '[resend-confirmation]',
    })

    if (!result.emailSent) {
      return Response.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error('Error in send-ticket-confirmation:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
