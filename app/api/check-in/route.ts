import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ticketId, eventId } = body

    if (!ticketId || !eventId) {
      return NextResponse.json(
        { error: 'Missing ticketId or eventId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Query ticket directly by QR code and event ID
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('qr_code_data', ticketId)
      .eq('event_id', eventId)
      .single()

    if (ticketError || !ticket) {
      // Try finding by ticket ID as fallback (some QR codes use ticket ID directly)
      const { data: ticketById } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('event_id', eventId)
        .single()

      if (!ticketById) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        )
      }
      
      // Use the ticket found by ID
      Object.assign(ticket || {}, ticketById)
    }

    const foundTicket = ticket!

    // Get event to verify organizer
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, organizer_id, title')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Verify user is the organizer
    if (event.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the event organizer can check in attendees' },
        { status: 403 }
      )
    }

    // Check if already checked in
    if (foundTicket.checked_in_at) {
      return NextResponse.json(
        { 
          error: `Already checked in at ${new Date(foundTicket.checked_in_at).toLocaleString()}`,
          attendee: foundTicket.attendee_name || 'Unknown'
        },
        { status: 400 }
      )
    }

    // Get attendee info if we have an attendee_id
    let attendeeName = foundTicket.attendee_name || 'Unknown'
    if (foundTicket.attendee_id) {
      const { data: attendee } = await supabase
        .from('users')
        .select('name, email, full_name')
        .eq('id', foundTicket.attendee_id)
        .single()

      if (attendee) {
        attendeeName = attendee.full_name || attendee.name || attendee.email || 'Unknown'
      }
    }

    // Update ticket with check-in time
    const checkedInAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        checked_in_at: checkedInAt,
        checked_in: true,
        checked_in_by: user.id,
        check_in_method: 'scan'
      })
      .eq('id', foundTicket.id)

    if (updateError) {
      console.error('Failed to update ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to check in ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      attendee: attendeeName,
      ticket: {
        id: foundTicket.id,
        status: foundTicket.status,
        checked_in_at: checkedInAt
      }
    })
  } catch (error: any) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
