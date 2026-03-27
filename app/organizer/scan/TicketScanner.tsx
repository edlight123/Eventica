'use client'

import { useState, FormEvent } from 'react'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { isDemoMode, DEMO_TICKETS, DEMO_EVENTS } from '@/lib/demo'

interface TicketScannerProps {
  organizerId: string
}

interface ValidationResult {
  success: boolean
  message: string
  ticket?: any
  event?: any
}

export default function TicketScanner({ organizerId }: TicketScannerProps) {
  const [qrData, setQrData] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)

  async function handleValidate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      // Parse QR code data (format: ticket:uuid|event:uuid)
      const parts = qrData.trim().split('|')
      if (parts.length !== 2) {
        setResult({
          success: false,
          message: 'Invalid QR code format. Expected format: ticket:[id]|event:[id]'
        })
        setLoading(false)
        return
      }

      const ticketId = parts[0].replace('ticket:', '')
      const eventId = parts[1].replace('event:', '')

      // Demo mode validation
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay
        
        const demoTicket = DEMO_TICKETS.find(t => t.id === ticketId)
        const demoEvent = DEMO_EVENTS.find(e => e.id === eventId)

        if (!demoTicket || !demoEvent) {
          setResult({
            success: false,
            message: '❌ Invalid ticket. This ticket does not exist.'
          })
          setLoading(false)
          return
        }

        if (demoTicket.event_id !== eventId) {
          setResult({
            success: false,
            message: '❌ Ticket/Event mismatch. This ticket is for a different event.'
          })
          setLoading(false)
          return
        }

        // In demo mode, all tickets are valid (we don't track scan state)
        setResult({
          success: true,
          message: '✅ Valid ticket! (Demo mode - ticket not actually marked as used)',
          ticket: { ...demoTicket, users: { full_name: 'Demo Attendee', email: 'demo-attendee@joineventica.com' } },
          event: demoEvent
        })
        setLoading(false)
        return
      }

      // Real database validation
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          events!tickets_event_id_fkey (
            id,
            title,
            organizer_id,
            start_datetime
          ),
          users!tickets_attendee_id_fkey (
            full_name,
            email
          )
        `)
        .eq('id', ticketId)
        .single()

      if (ticketError || !ticket) {
        setResult({
          success: false,
          message: '❌ Invalid ticket. This ticket does not exist.'
        })
        setLoading(false)
        return
      }

      const event = ticket.events as any
      const attendee = ticket.users as any

      // Verify ticket belongs to the correct event
      if (ticket.event_id !== eventId) {
        setResult({
          success: false,
          message: '❌ Ticket/Event mismatch. This ticket is for a different event.'
        })
        setLoading(false)
        return
      }

      // Verify organizer owns this event
      if (event.organizer_id !== organizerId) {
        setResult({
          success: false,
          message: '❌ Unauthorized. You are not the organizer of this event.'
        })
        setLoading(false)
        return
      }

      // Check if ticket is already used
      if (ticket.status === 'used') {
        setResult({
          success: false,
          message: `⚠️ Ticket already used. This ticket was scanned previously.`,
          ticket,
          event
        })
        setLoading(false)
        return
      }

      // Check if ticket is cancelled
      if (ticket.status === 'cancelled') {
        setResult({
          success: false,
          message: '❌ Ticket cancelled. This ticket has been cancelled.'
        })
        setLoading(false)
        return
      }

      // Mark ticket as used and record check-in time
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          status: 'used',
          checked_in_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (updateError) throw updateError

      // Record the scan
      await supabase
        .from('ticket_scans')
        .insert({
          ticket_id: ticketId,
          event_id: eventId,
          scanned_by: organizerId,
          result: 'valid'
        })

      setResult({
        success: true,
        message: `✅ Valid ticket! Welcome, ${attendee.full_name || 'Guest'}!`,
        ticket,
        event
      })

      // Clear the input after successful scan
      setQrData('')
    } catch (err: any) {
      setResult({
        success: false,
        message: `Error: ${err.message || 'Failed to validate ticket'}`
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <form onSubmit={handleValidate} className="space-y-6">
        <div>
          <label htmlFor="qrData" className="block text-sm font-medium text-gray-700 mb-2">
            QR Code Data or Ticket ID
          </label>
          <textarea
            id="qrData"
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            rows={3}
            placeholder="Paste QR code data here (e.g., ticket:abc123|event:xyz456)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent font-mono text-sm"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: ticket:[ticket-id]|event:[event-id]
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !qrData.trim()}
          className="w-full py-3 px-6 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Validating...' : 'Validate Ticket'}
        </button>
      </form>

      {/* Result Display */}
      {result && (
        <div className={`mt-6 p-6 rounded-lg border-2 ${
          result.success
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}>
          <p className={`text-lg font-semibold mb-2 ${
            result.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {result.message}
          </p>

          {result.ticket && result.event && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Event:</p>
                  <p className="font-semibold text-gray-900">{result.event.title}</p>
                </div>
                <div>
                  <p className="text-gray-600">Attendee:</p>
                  <p className="font-semibold text-gray-900">
                    {result.ticket.users?.full_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Ticket ID:</p>
                  <p className="font-mono text-xs text-gray-900">{result.ticket.id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status:</p>
                  <p className={`font-semibold ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.ticket.status.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
