'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface TransferAcceptFormProps {
  transfer: any
  ticket: any
  event: any
  sender: any
  currentUser: any
}

export default function TransferAcceptForm({ transfer, ticket, event, sender, currentUser }: TransferAcceptFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tickets/transfer/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferToken: transfer.transfer_token,
          action: 'accept'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept transfer')
      }

      // Redirect to tickets page
      router.push('/tickets?transferred=true')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!confirm('Are you sure you want to reject this ticket transfer?')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tickets/transfer/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferToken: transfer.transfer_token,
          action: 'reject'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject transfer')
      }

      // Redirect to tickets page
      router.push('/tickets')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0a0a0a] rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-800 text-white p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">🎟️ Ticket Transfer</h1>
        <p className="text-[13px] sm:text-base text-brand-50">You&apos;ve received a ticket!</p>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Sender Info */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-brand-100 rounded-lg">
          <p className="text-[13px] sm:text-sm text-brand-300 mb-1">
            <strong>{sender?.name || sender?.full_name || 'Someone'}</strong> wants to transfer a ticket to you
          </p>
          <p className="text-[11px] sm:text-xs text-brand-300">
            {sender?.email || transfer.from_user_id}
          </p>
        </div>

        {/* Event Details */}
        {event && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">{String(event.title || '').replace(/^\[[^\]]*\]\s*/, '')}</h2>
            
            <div className="space-y-2.5 sm:space-y-3 text-white/70">
              <div className="flex items-start">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 mt-0.5 flex-shrink-0 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-[13px] sm:text-base font-semibold">{format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-[11px] sm:text-sm text-white/60">
                    {format(new Date(event.start_datetime), 'h:mm a')} - {format(new Date(event.end_datetime), 'h:mm a')}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 mt-0.5 flex-shrink-0 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="min-w-0">
                  <p className="text-[13px] sm:text-base font-semibold">{event.venue_name}</p>
                  <p className="text-[11px] sm:text-sm text-white/60">{event.address}</p>
                  <p className="text-[11px] sm:text-sm text-white/60">{event.commune}, {event.city}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message from sender */}
        {transfer.message && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#0a0a0a]  rounded-lg">
            <p className="text-[11px] sm:text-sm font-semibold text-white/70 mb-1 sm:mb-2">Message from sender:</p>
            <p className="text-[13px] sm:text-base text-white/60 italic">&quot;{transfer.message}&quot;</p>
          </div>
        )}

        {/* Expiry Notice */}
        {transfer.expires_at && (
          <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 border border-amber-200 rounded-lg">
            <p className="text-[11px] sm:text-sm text-amber-300">
              ⏰ This transfer expires on <strong>{format(new Date(transfer.expires_at), 'MMM d, yyyy h:mm a')}</strong>
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-red-200 rounded-lg">
            <p className="text-[13px] sm:text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#0a0a0a]  rounded-lg">
          <h3 className="text-[13px] sm:text-base font-semibold text-white mb-1.5 sm:mb-2">What happens when you accept?</h3>
          <ul className="text-[11px] sm:text-sm text-white/70 space-y-0.5 sm:space-y-1">
            <li>• This ticket will be transferred to your account</li>
            <li>• The sender will no longer have access to it</li>
            <li>• You&apos;ll be able to view the QR code and use it at the event</li>
            <li>• Both you and the sender will receive confirmation emails</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3  rounded-lg text-[13px] sm:text-base text-white/70 font-semibold hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            Reject Transfer
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-600 text-white text-[13px] sm:text-base font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            {loading ? 'Processing...' : '✓ Accept Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}
