'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/fees'
import { StatusChip } from '@/components/ui/kit'

interface Withdrawal {
  id: string
  organizerId: string
  eventId: string
  amount: number
  method: 'moncash' | 'bank'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  moncashNumber?: string
  bankDetails?: {
    accountNumber: string
    bankName: string
    accountHolder: string
    swiftCode?: string
    routingNumber?: string
  }
  createdAt: string
  processedAt?: string
  completedAt?: string
  failureReason?: string
  adminNote?: string
  completionNote?: string
  event: {
    id: string
    title: string
    date: string
  } | null
  organizer: {
    id: string
    name: string
    email: string
  } | null
}

interface WithdrawalsViewProps {
  embedded?: boolean
  showHeader?: boolean
}

export default function WithdrawalsView({ embedded = false, showHeader = true }: WithdrawalsViewProps) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('pending')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/withdrawals?status=all&limit=200')
      const data = await response.json()
      setWithdrawals(data.withdrawals || [])
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWithdrawals()
  }, [fetchWithdrawals])

  const visibleWithdrawals = filter === 'all'
    ? withdrawals
    : withdrawals.filter(w => w.status === filter)

  const handleAction = async (withdrawalId: string, action: 'approve' | 'reject' | 'complete' | 'fail') => {
    if (!confirm(`Are you sure you want to ${action} this withdrawal?`)) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, action, note: actionNote })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} withdrawal`)
      }

      alert(`✅ Withdrawal ${action}d successfully`)
      setSelectedWithdrawal(null)
      setActionNote('')
      fetchWithdrawals()
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (!['completed', 'processing', 'pending', 'failed'].includes(status)) return null
    return <StatusChip status={status} />
  }

  const getMethodIcon = (method: string) => {
    return method === 'moncash' ? '📱' : '🏦'
  }

  const containerClassName = embedded
    ? ''
    : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6'

  return (
    <div className={containerClassName}>
      {showHeader && (
        <div className="mb-5">
          <h1 className="font-display text-[clamp(22px,3vw,30px)] leading-[1.06] text-gray-900 mb-1">Withdrawal Management</h1>
          <p className="text-sm text-gray-500">Review and process organizer withdrawal requests</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 mb-6 flex flex-wrap">
        {['pending', 'processing', 'completed', 'failed', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === tab
                ? 'bg-brand-700 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 text-xs">
              ({tab === 'all' ? withdrawals.length : withdrawals.filter(w => w.status === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* Withdrawals List */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-gray-400 mb-2">Loading...</div>
        </div>
      ) : visibleWithdrawals.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <span className="text-6xl mb-4 block">📭</span>
          <h3 className="font-display text-xl text-gray-900 mb-2">No Withdrawals</h3>
          <p className="text-gray-600">No {filter !== 'all' ? filter : ''} withdrawal requests found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{withdrawal.organizer?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{withdrawal.organizer?.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{withdrawal.event?.title || 'Unknown Event'}</div>
                      <div className="text-sm text-gray-500">
                        {withdrawal.event?.date ? new Date(withdrawal.event.date).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{formatCurrency(withdrawal.amount)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span>{getMethodIcon(withdrawal.method)}</span>
                        <span className="text-sm font-medium text-gray-700">
                          {withdrawal.method === 'moncash' ? 'MonCash' : 'Bank'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(withdrawal.status)}</td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(withdrawal.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                        className="text-brand-700 hover:text-brand-800 font-medium text-sm"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {visibleWithdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedWithdrawal(withdrawal)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{withdrawal.organizer?.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{withdrawal.event?.title}</div>
                  </div>
                  {getStatusBadge(withdrawal.status)}
                </div>
                <div className="flex justify-between items-center">
                  <div className="font-bold text-gray-900">{formatCurrency(withdrawal.amount)}</div>
                  <div className="text-sm text-gray-500">
                    {getMethodIcon(withdrawal.method)} {withdrawal.method === 'moncash' ? 'MonCash' : 'Bank'}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(withdrawal.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-display text-2xl text-gray-900">Withdrawal Details</h2>
              <button
                onClick={() => {
                  setSelectedWithdrawal(null)
                  setActionNote('')
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Status & Amount */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <div>{getStatusBadge(selectedWithdrawal.status)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Amount</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(selectedWithdrawal.amount)}</div>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">👤 Organizer</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{selectedWithdrawal.organizer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{selectedWithdrawal.organizer?.email}</span>
                </div>
              </div>
            </div>

            {/* Event Info */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">📅 Event</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Title:</span>
                  <span className="font-medium text-gray-900">{selectedWithdrawal.event?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">
                    {selectedWithdrawal.event?.date ? new Date(selectedWithdrawal.event.date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">
                {getMethodIcon(selectedWithdrawal.method)} Payment Method
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium text-gray-900">
                    {selectedWithdrawal.method === 'moncash' ? 'MonCash' : 'Bank Transfer'}
                  </span>
                </div>
                {selectedWithdrawal.method === 'moncash' && selectedWithdrawal.moncashNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium text-gray-900">{selectedWithdrawal.moncashNumber}</span>
                  </div>
                )}
                {selectedWithdrawal.method === 'bank' && selectedWithdrawal.bankDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Holder:</span>
                      <span className="font-medium text-gray-900">{selectedWithdrawal.bankDetails.accountHolder}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank:</span>
                      <span className="font-medium text-gray-900">{selectedWithdrawal.bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account #:</span>
                      <span className="font-medium text-gray-900">{selectedWithdrawal.bankDetails.accountNumber}</span>
                    </div>
                    {selectedWithdrawal.bankDetails.routingNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Routing:</span>
                        <span className="font-medium text-gray-900">{selectedWithdrawal.bankDetails.routingNumber}</span>
                      </div>
                    )}
                    {selectedWithdrawal.bankDetails.swiftCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">SWIFT:</span>
                        <span className="font-medium text-gray-900">{selectedWithdrawal.bankDetails.swiftCode}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-3">🕐 Timeline</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedWithdrawal.createdAt).toLocaleString()}
                  </span>
                </div>
                {selectedWithdrawal.processedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processed:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedWithdrawal.processedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedWithdrawal.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(selectedWithdrawal.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Failure Reason */}
            {selectedWithdrawal.failureReason && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="font-bold text-red-900 mb-1">❌ Failure Reason</div>
                <div className="text-red-800">{selectedWithdrawal.failureReason}</div>
              </div>
            )}

            {/* Action Note Input */}
            {selectedWithdrawal.status === 'pending' || selectedWithdrawal.status === 'processing' ? (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (optional)
                </label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Add a note about this action..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {selectedWithdrawal.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAction(selectedWithdrawal.id, 'approve')}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300"
                  >
                    ✓ Approve & Process
                  </button>
                  <button
                    onClick={() => handleAction(selectedWithdrawal.id, 'reject')}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-300"
                  >
                    ✗ Reject
                  </button>
                </>
              )}
              {selectedWithdrawal.status === 'processing' && (
                <>
                  <button
                    onClick={() => handleAction(selectedWithdrawal.id, 'complete')}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium disabled:bg-gray-300"
                  >
                    ✓ Mark Complete
                  </button>
                  <button
                    onClick={() => handleAction(selectedWithdrawal.id, 'fail')}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-300"
                  >
                    ✗ Mark Failed
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
