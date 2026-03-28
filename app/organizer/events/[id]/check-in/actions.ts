'use server'

import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { loadTicketDocsForEvent } from '@/lib/tickets/loadTicketsForEvent'

export async function checkInTicket(
  eventId: string,
  qrCode: string,
  entryPoint: string
): Promise<{ success: boolean; error?: string }> {
  // ── Auth + ownership check ────────────────────────────────────────────────
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  if (user.role !== 'organizer' && user.role !== 'admin' && user.role !== 'super_admin') {
    return { success: false, error: 'Organizer access required' }
  }

  // Organizers must own the event; admins may act on any event.
  if (user.role === 'organizer') {
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    if (!eventDoc.exists) return { success: false, error: 'Event not found' }
    if (eventDoc.data()?.organizer_id !== user.id) {
      return { success: false, error: 'You do not own this event' }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    // Find ticket by QR code or ticket ID
    const ticketDocs = await loadTicketDocsForEvent(eventId)

    const ticketDoc = ticketDocs.find((doc: any) => {
      const data = doc.data() || {}
      return data.qr_code === qrCode || data.qr_code_data === qrCode || doc.id === qrCode
    })

    if (!ticketDoc) {
      return { success: false, error: 'Ticket not found' }
    }

    const ticketData = ticketDoc.data()

    // Check if already checked in
    if (ticketData.checked_in) {
      return { success: false, error: 'Already checked in' }
    }

    // Check ticket status
    if (ticketData.status !== 'valid' && ticketData.status !== 'confirmed') {
      return { success: false, error: `Ticket is ${ticketData.status}` }
    }

    // Update ticket
    await adminDb.collection('tickets').doc(ticketDoc.id).update({
      checked_in: true,
      checked_in_at: new Date(),
      entry_point: entryPoint,
      updated_at: new Date(),
    })

    revalidatePath(`/organizer/events/${eventId}/check-in`)
    revalidatePath(`/organizer/events/${eventId}/attendees`)

    return { success: true }
  } catch (error) {
    console.error('Check-in error:', error)
    return { success: false, error: 'Check-in failed' }
  }
}
