import { createClient } from '@/lib/firebase-db/server'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { generateTicketQRCode } from '@/lib/qrcode'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAdmin()
    if (authError || !user) {
      return Response.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { ticketId, userId } = await request.json()

    if (!ticketId || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get ticket and event details
    const supabase = await createClient()

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error('Error fetching ticket:', ticketError)
      return Response.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', ticket.event_id)
      .single()

    if (eventError || !event) {
      console.error('Error fetching event:', eventError)
      return Response.json({ error: 'Event not found' }, { status: 404 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Format event date
    const eventDate = new Date(event.start_datetime)
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const qrPayload = String((ticket as any)?.qr_code_data || ticket.id || ticket.ticket_number || ticketId)
    const qrCodeDataURL = await generateTicketQRCode(qrPayload)

    const html = getTicketConfirmationEmail({
      attendeeName: user.full_name || 'Guest',
      eventTitle: event.title,
      eventDate: `${formattedDate} • ${formattedTime}`,
      eventVenue: `${event.venue_name}, ${event.city}`,
      ticketId: String(ticket.id || ticketId),
      qrCodeDataURL,
    })

    const ticketWord = 'ticket'
    const result = await sendEmail({
      to: user.email,
      subject: `Your ${ticketWord} for ${event.title}`,
      html,
    })

    if (!result.success) {
      return Response.json({ error: 'Failed to send email', details: result.error || result.messageId }, { status: 500 })
    }

    return Response.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error('Error in send-ticket-confirmation:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
