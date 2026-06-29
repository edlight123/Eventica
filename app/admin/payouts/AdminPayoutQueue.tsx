'use client'

import { useState } from 'react'
import { Clock, Wallet, Download } from 'lucide-react'
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
    <div className="space-y-4">
      {/* Summary Strip */}
      <div className="grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10">
        <div className="p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
            <Clock className="h-3.5 w-3.5 text-white/30" /> Pending Requests
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">{payouts.length}</div>
        </div>
        <div className="p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
            <Wallet className="h-3.5 w-3.5 text-white/30" /> Total Amount
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">
            {formatCurrency(payouts.reduce((sum, p) => sum + p.amount, 0))}
          </div>
        </div>
        <div className="flex items-center justify-center p-4">
          <button
            onClick={exportCSV}
            disabled={payouts.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-semibold text-white">Pending Payouts</h2>
        </div>

        {payouts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-white/50">No pending payout requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Organizer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Tickets</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Scheduled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-white/[0.04]">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{payout.organizer.name}</div>
                      <div className="text-sm text-white/50">{payout.organizer.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {formatCurrency(payout.amount, payout.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {payout.method === 'mobile_money' ? 'MonCash/Natcash' : 'Bank Transfer'}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {payout.ticketIds?.length || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {new Date(payout.scheduledDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-3">
                      <button
                        onClick={() => openModal(payout, 'approve')}
                        className="font-medium text-emerald-300 hover:text-emerald-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openModal(payout, 'mark-paid')}
                        className="font-medium text-brand-300 hover:text-brand-200"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => openModal(payout, 'decline')}
                        className="font-medium text-red-300 hover:text-red-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-8 w-full max-w-2xl rounded-xl border border-white/10 bg-[#0a0a0a] p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
              {modalMode === 'approve' && 'Approve Payout'}
              {modalMode === 'decline' && 'Decline Payout'}
              {modalMode === 'mark-paid' && 'Mark Payout as Paid'}
            </h3>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/40 p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="mb-6 space-y-3 rounded-lg border border-white/10 p-4 text-sm text-white/70">
              <div>
                <span className="font-medium text-white/50">Organizer:</span>{' '}
                <span className="text-white">{selectedPayout.organizer.name}</span>
              </div>
              <div>
                <span className="font-medium text-white/50">Amount:</span>{' '}
                <span className="tabular-nums text-white">{formatCurrency(selectedPayout.amount, selectedPayout.currency)}</span>
              </div>
              <div>
                <span className="font-medium text-white/50">Method:</span>{' '}
                <span className="text-white">{selectedPayout.method === 'mobile_money' ? 'MonCash/Natcash' : 'Bank Transfer'}</span>
              </div>
            </div>

            {modalMode === 'decline' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Reason for Declining *
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
                  placeholder="Explain why this payout is being declined..."
                />
              </div>
            )}

            {modalMode === 'mark-paid' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Payment Reference ID *
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
                    placeholder="Bank transaction ID or MonCash reference"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
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
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
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
                className={`flex-1 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:opacity-50 ${
                  modalMode === 'decline'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-brand-600 hover:bg-brand-700'
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
