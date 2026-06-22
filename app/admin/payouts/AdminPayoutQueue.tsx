'use client'

import { useState } from 'react'
import PayoutReceiptUpload from '@/components/admin/PayoutReceiptUpload'

interface Payout {
  id: string
  organizerId: string
  amount: number
  status: string
  method: string
  createdAt: string
  scheduledDate: string
  ticketIds?: string[]
  periodStart?: string
  periodEnd?: string
  currency?: string
  organizer: {
    id: string
    name: string
    email: string
  }
  payoutConfig: any
}

interface AdminPayoutQueueProps {
  initialPayouts: Payout[]
}

export default function AdminPayoutQueue({ initialPayouts }: AdminPayoutQueueProps) {
  const [payouts, setPayouts] = useState(initialPayouts)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'approve' | 'decline' | 'mark-paid'>('approve')
  const [paymentRef, setPaymentRef] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  const formatCurrency = (cents: number, currency: string = 'HTG') => {
    const symbol = currency === 'HTG' ? 'G ' : '$'
    return `${symbol}${(cents / 100).toFixed(2)}`
  }

  const openModal = (payout: Payout, mode: 'approve' | 'decline' | 'mark-paid') => {
    setSelectedPayout(payout)
    setModalMode(mode)
    setShowModal(true)
    setError(null)
    setPaymentRef('')
    setDeclineReason('')
    setPaymentNotes('')
    setReceiptUrl(null)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedPayout(null)
    setPaymentRef('')
    setDeclineReason('')
    setPaymentNotes('')
    setError(null)
    setReceiptUrl(null)
  }

  const handleApprove = async () => {
    if (!selectedPayout) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/payouts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: selectedPayout.organizerId,
          payoutId: selectedPayout.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to approve payout')
      }

      // Remove from list
      setPayouts(payouts.filter(p => p.id !== selectedPayout.id))
      closeModal()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!selectedPayout || !declineReason.trim()) {
      setError('Please provide a reason for declining')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/payouts/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: selectedPayout.organizerId,
          payoutId: selectedPayout.id,
          reason: declineReason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to decline payout')
      }

      setPayouts(payouts.filter(p => p.id !== selectedPayout.id))
      closeModal()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!selectedPayout || !paymentRef.trim()) {
      setError('Payment reference ID is required')
      return
    }

    if (!receiptUrl) {
      setError('Please upload a payment receipt before marking as paid')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/payouts/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: selectedPayout.organizerId,
          payoutId: selectedPayout.id,
          paymentReferenceId: paymentRef,
          paymentMethod: selectedPayout.method,
          paymentNotes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to mark payout as paid')
      }

      setPayouts(payouts.filter(p => p.id !== selectedPayout.id))
      closeModal()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const exportCSV = () => {
    const headers = ['Organizer Name', 'Email', 'Amount', 'Currency', 'Method', 'Requested Date', 'Scheduled Date', 'Tickets Count', 'Period']
    const rows = payouts.map(p => [
      p.organizer.name,
      p.organizer.email,
      (p.amount / 100).toFixed(2),
      p.currency || 'HTG',
      p.method === 'mobile_money' ? 'MonCash/Natcash' : 'Bank Transfer',
      new Date(p.createdAt).toLocaleDateString(),
      new Date(p.scheduledDate).toLocaleDateString(),
      p.ticketIds?.length || 0,
      p.periodStart && p.periodEnd ? `${new Date(p.periodStart).toLocaleDateString()} - ${new Date(p.periodEnd).toLocaleDateString()}` : 'N/A',
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payouts_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Pending Requests</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{payouts.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total Amount</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {formatCurrency(payouts.reduce((sum, p) => sum + p.amount, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
          <button
            onClick={exportCSV}
            disabled={payouts.length === 0}
            className="px-6 py-3 bg-brand-700 text-white rounded-lg font-medium hover:bg-brand-800 transition-colors disabled:bg-gray-300"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pending Payouts</h2>
        </div>

        {payouts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">No pending payout requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tickets</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{payout.organizer.name}</div>
                      <div className="text-sm text-gray-500">{payout.organizer.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(payout.amount, payout.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payout.method === 'mobile_money' ? 'MonCash/Natcash' : 'Bank Transfer'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payout.ticketIds?.length || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(payout.scheduledDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => openModal(payout, 'approve')}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openModal(payout, 'mark-paid')}
                        className="text-brand-700 hover:text-brand-800 font-medium"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => openModal(payout, 'decline')}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {modalMode === 'approve' && 'Approve Payout'}
              {modalMode === 'decline' && 'Decline Payout'}
              {modalMode === 'mark-paid' && 'Mark Payout as Paid'}
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div>
                <span className="font-medium">Organizer:</span> {selectedPayout.organizer.name}
              </div>
              <div>
                <span className="font-medium">Amount:</span> {formatCurrency(selectedPayout.amount, selectedPayout.currency)}
              </div>
              <div>
                <span className="font-medium">Method:</span> {selectedPayout.method === 'mobile_money' ? 'MonCash/Natcash' : 'Bank Transfer'}
              </div>
            </div>

            {modalMode === 'decline' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Declining *
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Explain why this payout is being declined..."
                />
              </div>
            )}

            {modalMode === 'mark-paid' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Reference ID *
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Bank transaction ID or MonCash reference"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Additional notes about this payment..."
                  />
                </div>
                
                {/* Receipt Upload */}
                <div className="mb-4">
                  <PayoutReceiptUpload
                    payoutId={selectedPayout.id}
                    organizerId={selectedPayout.organizerId}
                    onUploadComplete={(url) => setReceiptUrl(url)}
                  />
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modalMode === 'approve') handleApprove()
                  else if (modalMode === 'decline') handleDecline()
                  else handleMarkPaid()
                }}
                disabled={isProcessing}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium ${
                  modalMode === 'decline'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-brand-700 hover:bg-brand-800'
                }`}
              >
                {isProcessing ? 'Processing...' : modalMode === 'approve' ? 'Approve' : modalMode === 'decline' ? 'Decline' : 'Mark Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
