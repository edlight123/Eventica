'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import camera scanner (client-side only)
const CameraQRScanner = dynamic(
  () => import('@/components/CameraQRScanner'),
  { ssr: false }
)

export default function CheckInScanner({ eventId }: { eventId: string }) {
  const [ticketId, setTicketId] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera')

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    await checkInTicket(ticketId)
  }

  async function checkInTicket(ticketIdToCheck: string) {
    if (loading) return // Prevent duplicate checks
    
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticketIdToCheck, eventId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Check-in failed')
      }

      setMessage({ type: 'success', text: `✓ Checked in: ${data.attendee}` })
      setTicketId('')
      
      // Refresh the page after successful check-in
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
      
      // Clear error after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  function handleQRScan(data: string) {
    // Extract ticket ID from QR code data
    const ticketIdFromQR = data.trim()
    checkInTicket(ticketIdFromQR)
  }

  return (
    <div>
      {/* Scan Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setScanMode('camera')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            scanMode === 'camera'
              ? 'bg-brand-700 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📷 Live Camera
        </button>
        <button
          onClick={() => setScanMode('manual')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            scanMode === 'manual'
              ? 'bg-brand-700 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⌨️ Manual Entry
        </button>
      </div>

      {scanMode === 'camera' ? (
        <div className="mb-4">
          <CameraQRScanner
            onScan={handleQRScan}
            onError={(error) => {
              console.error('Camera error:', error)
              setMessage({ type: 'error', text: 'Camera access denied. Please enable camera permissions or use manual entry.' })
            }}
            width={640}
            height={480}
          />
        </div>
      ) : (
        <div className="bg-gray-100 rounded-xl p-8 mb-4 text-center">
          <div className="inline-flex items-center justify-center w-48 h-48 bg-white rounded-2xl border-4 border-dashed border-gray-300">
            <div className="text-gray-400">
              <svg className="w-24 h-24 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-sm font-medium">Manual Entry</p>
              <p className="text-xs mt-1">Enter ticket ID below</p>
            </div>
          </div>
        </div>
      )}

      {scanMode === 'manual' && (
        <div className="text-center text-sm text-gray-500 mb-4">
          Enter the ticket ID from the attendee&apos;s QR code
        </div>
      )}

      <form onSubmit={handleCheckIn} className="space-y-4">
        <input
          type="text"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          placeholder="Enter ticket ID"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />

        {message && (
          <div className={`p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !ticketId}
          className="w-full px-6 py-3 rounded-xl bg-brand-700 text-white font-semibold hover:bg-brand-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking in...' : 'Check In'}
        </button>
      </form>
    </div>
  )
}
