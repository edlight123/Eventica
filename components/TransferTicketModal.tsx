'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomSheet from '@/components/ui/BottomSheet'

interface TransferTicketModalProps {
  ticketId: string
  eventTitle: string
  transferCount: number
}

export default function TransferTicketModal({
  ticketId,
  eventTitle,
  transferCount,
}: TransferTicketModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [toEmail, setToEmail] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/tickets/transfer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, toEmail: toEmail.trim(), message: reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer ticket')
      }

      alert(data.message || 'Transfer link sent!')
      setIsOpen(false)
      setToEmail('')
      setReason('')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Failed to transfer ticket')
    } finally {
      setLoading(false)
    }
  }

  const canTransfer = transferCount < 3

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={!canTransfer}
        className={`px-4 py-2 text-sm font-medium rounded-lg ${
          canTransfer
            ? 'bg-teal-600 text-white hover:bg-teal-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title={!canTransfer ? 'Ticket has been transferred maximum times' : undefined}
      >
        Transfer Ticket
      </button>

      {isOpen && (
        <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Transfer Ticket">
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 mb-2">
                Transfer your ticket for <strong>{eventTitle}</strong> to another user.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ This ticket has been transferred {transferCount} time(s). 
                  Maximum allowed: 3 transfers.
                </p>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recipient must have an Eventica account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you transferring this ticket?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  ⓘ Once transferred, you will lose access to this ticket. 
                  The transfer cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Transferring...' : 'Transfer Ticket'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
