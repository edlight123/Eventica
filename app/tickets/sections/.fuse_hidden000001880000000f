import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'
import { createClient } from '@/lib/firebase-db/server'
import TicketsListClient from './TicketsListClient'

function serializeTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (obj.toDate && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString()
  }
  if (Array.isArray(obj)) {
    return obj.map(item => serializeTimestamps(item))
  }
  const serialized: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      serialized[key] = serializeTimestamps(obj[key])
    }
  }
  return serialized
}

export default async function MyTicketsList({ userId }: { userId: string }) {
  let eventsWithTickets: any[] = []

  if (isDemoMode()) {
    const ticketsByEvent = new Map()
    DEMO_TICKETS.forEach(ticket => {
      if (!ticketsByEvent.has(ticket.event_id)) {
        ticketsByEvent.set(ticket.event_id, [])
      }
      ticketsByEvent.get(ticket.event_id).push(ticket)
    })

    eventsWithTickets = Array.from(ticketsByEvent.entries()).map(([eventId, tickets]) => {
      const event = DEMO_EVENTS.find(e => e.id === eventId)
      return {
        event,
        tickets,
        ticketCount: (tickets as any[]).length
      }
    })
  } else {
    const supabase = await createClient()
    const allTicketsQuery = await supabase.from('tickets').select('*')
    const allTicketsData = allTicketsQuery.data
    const ticketsData = allTicketsData?.filter((t: any) => t.attendee_id === userId) || []

    if (!ticketsData || ticketsData.length === 0) {
      eventsWithTickets = []
    } else {
      const eventsQuery = await supabase.from('events').select('*')
      const eventsData = eventsQuery.data || []
      const ticketsByEvent = new Map()

      ticketsData.forEach((ticket: any) => {
        if (!ticketsByEvent.has(ticket.event_id)) {
          ticketsByEvent.set(ticket.event_id, [])
        }
        ticketsByEvent.get(ticket.event_id).push(ticket)
      })

      eventsWithTickets = Array.from(ticketsByEvent.entries()).map(([eventId, tickets]) => {
        const event = eventsData?.find((e: any) => e.id === eventId)
        const serializedEvent = event ? serializeTimestamps(event) : null
        return {
          event: serializedEvent,
          ticketCount: (tickets as any[]).length
        }
      }).filter(item => item.event)
    }
  }

  // Separate upcoming and past events
  const now = new Date()
  const upcomingEvents = eventsWithTickets
    .filter(item => new Date(item.event.start_datetime) >= now)
    .sort((a, b) => new Date(a.event.start_datetime).getTime() - new Date(b.event.start_datetime).getTime())

  const pastEvents = eventsWithTickets
    .filter(item => new Date(item.event.start_datetime) < now)
    .sort((a, b) => new Date(b.event.start_datetime).getTime() - new Date(a.event.start_datetime).getTime())

  return <TicketsListClient upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
}
