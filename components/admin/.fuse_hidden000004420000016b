'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { StatusChip } from '@/components/ui/kit'
import { 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Building2,
  Smartphone,
  CreditCard,
  Copy,
  Eye,
  Send
} from 'lucide-react'

interface EventDisbursementInfo {
  eventId: string
  eventTitle: string
  organizerId: string
  organizerName: string
  organizerEmail: string
  startDate: Date
  endDate: Date
  daysEnded: number
  totalTicketsSold: number
  grossRevenue: number
  platformFee: number
  netRevenue: number
  currency: string
  hasPendingPayout: boolean
  hasCompletedPayout: boolean
  payoutEligible: boolean
  payoutMethod?: string
  bankInfo?: {
    accountName?: string
    accountNumber?: string
    accountNumberFull?: string
    bankName?: string
    routingNumber?: string
    swift?: string
    iban?: string
    mobileNumber?: string
    provider?: string
    mobileAccountName?: string
  }
}

interface Stats {
  eventsEndedLast7Days: number
  pendingPayouts: number
  approvedPayouts: number
  totalPendingAmount: number
}

interface Props {
  endedEvents: EventDisbursementInfo[]
  stats: Stats
}

export function AdminDisbursementDashboard({ endedEvents, stats }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<EventDisbursementInfo | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'eligible' | 'pending' | 'completed'>('eligible')
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedValue(value)
      window.setTimeout(() => setCopiedValue((current) => (current === value ? null : current)), 1500)
    } catch {
      // Clipboard may be blocked by browser settings; fall back to a manual copy prompt.
      window.prompt('Copy to clipboard:', value)
    }
  }

  const getPayoutMethodLabel = (method?: string) => {
    if (method === 'bank_transfer') return 'Bank Transfer'
    if (method === 'mobile_money') return 'Mobile Money'
    return 'Not configured'
  }

  const hasBankDetails = (bankInfo?: EventDisbursementInfo['bankInfo']) => {
    if (!bankInfo) return false
    return Boolean(
      bankInfo.accountNumber ||
      bankInfo.accountNumberFull ||
      bankInfo.bankName ||
      bankInfo.accountName ||
      bankInfo.routingNumber ||
      bankInfo.swift ||
      bankInfo.iban
    )
  }

  const hasMobileDetails = (bankInfo?: EventDisbursementInfo['bankInfo']) => {
    if (!bankInfo) return false
    return Boolean(bankInfo.mobileNumber || bankInfo.provider || bankInfo.mobileAccountName)
  }

  const filteredEvents = endedEvents.filter(event => {
    if (filter === 'eligible') return event.payoutEligible && !event.hasPendingPayout
    if (filter === 'pending') return event.hasPendingPayout
    if (filter === 'completed') return event.hasCompletedPayout
    return true
  })

  const viewDetails = (event: EventDisbursementInfo) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  const initiatePayoutRequest = async (event: EventDisbursementInfo) => {
    // TODO: Implement payout request creation
    alert(`Initiate payout for ${event.eventTitle}`)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Events Ended (7d)</p>
              <p className="text-2xl font-bold text-white">{stats.eventsEndedLast7Days}</p>
            </div>
            <Calendar className="w-10 h-10 text-brand-500" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Pending Payouts</p>
              <p className="text-2xl font-bold text-amber-300">{stats.pendingPayouts}</p>
            </div>
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Approved Payouts</p>
              <p className="text-2xl font-bold text-emerald-300">{stats.approvedPayouts}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Pending Amount</p>
              <p className="text-2xl font-bold text-brand-300">
                {formatCurrency(stats.totalPendingAmount, 'HTG')}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-brand-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0a0a0a] rounded-lg shadow p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand-700 text-white'
                : 'bg-[#0a0a0a] text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            All Events ({endedEvents.length})
          </button>
          <button
            onClick={() => setFilter('eligible')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'eligible'
                ? 'bg-brand-700 text-white'
                : 'bg-[#0a0a0a] text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            Eligible for Payout ({endedEvents.filter(e => e.payoutEligible && !e.hasPendingPayout).length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-brand-700 text-white'
                : 'bg-[#0a0a0a] text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            Pending Payout ({endedEvents.filter(e => e.hasPendingPayout).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-brand-700 text-white'
                : 'bg-[#0a0a0a] text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            Completed ({endedEvents.filter(e => e.hasCompletedPayout).length})
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#0a0a0a] rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Ended Events</h2>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-white/50">No events match the current filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-[#0a0a0a]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Organizer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Ended</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Tickets</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">To Send</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[#0a0a0a] divide-y divide-white/10">
                {filteredEvents.map((event) => (
                  <tr key={event.eventId} className="hover:bg-white/[0.04]">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{event.eventTitle}</div>
                      <div className="text-xs text-white/50">{event.eventId.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{event.organizerName}</div>
                      <div className="text-xs text-white/50">{event.organizerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {event.daysEnded} day{event.daysEnded !== 1 ? 's' : ''} ago
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {event.totalTicketsSold}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-white">
                        {formatCurrency(event.netRevenue, event.currency as any)}
                      </div>
                      <div className="text-xs text-white/50">
                        Gross: {formatCurrency(event.grossRevenue, event.currency as any)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {event.payoutMethod === 'bank_transfer' && (
                          <div className="flex items-center gap-1 text-sm text-white/70">
                            <Building2 className="w-4 h-4" />
                            Bank Transfer
                          </div>
                        )}
                        {event.payoutMethod === 'mobile_money' && (
                          <div className="flex items-center gap-1 text-sm text-white/70">
                            <Smartphone className="w-4 h-4" />
                            Mobile Money
                          </div>
                        )}
                        {!event.payoutMethod && (
                          <div className="flex items-center gap-1 text-sm text-red-300">
                            <AlertCircle className="w-4 h-4" />
                            Not configured
                          </div>
                        )}

                        {event.payoutMethod === 'bank_transfer' && hasBankDetails(event.bankInfo) && (
                          <div className="text-xs text-white/50">
                            <div>{event.bankInfo?.bankName || 'Bank'}</div>
                            {event.bankInfo?.accountNumber && (
                              <div className="font-mono">Acct: {event.bankInfo.accountNumber}</div>
                            )}
                            {event.bankInfo?.routingNumber && (
                              <div className="font-mono">Routing: {event.bankInfo.routingNumber}</div>
                            )}
                          </div>
                        )}

                        {event.payoutMethod === 'mobile_money' && hasMobileDetails(event.bankInfo) && (
                          <div className="text-xs text-white/50">
                            <div>{event.bankInfo?.provider || 'Provider'}</div>
                            {event.bankInfo?.mobileNumber && (
                              <div className="font-mono">{event.bankInfo.mobileNumber}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {event.hasCompletedPayout && (
                        <StatusChip tone="success" icon={CheckCircle}>Paid</StatusChip>
                      )}
                      {event.hasPendingPayout && !event.hasCompletedPayout && (
                        <StatusChip tone="warning" icon={Clock}>Pending</StatusChip>
                      )}
                      {event.payoutEligible && !event.hasPendingPayout && !event.hasCompletedPayout && (
                        <StatusChip tone="brand" icon={AlertCircle}>Ready</StatusChip>
                      )}
                      {!event.payoutEligible && !event.hasPendingPayout && !event.hasCompletedPayout && (
                        <StatusChip tone="neutral">Not Eligible</StatusChip>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewDetails(event)}
                        className="text-brand-300 hover:text-brand-300 font-medium text-sm mr-3"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        View
                      </button>
                      {event.payoutEligible && !event.hasPendingPayout && !event.hasCompletedPayout && (
                        <button
                          onClick={() => initiatePayoutRequest(event)}
                          className="text-brand-300 hover:text-brand-300 font-medium text-sm"
                        >
                          <Send className="w-4 h-4 inline mr-1" />
                          Create Payout
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">{selectedEvent.eventTitle}</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-white/60">Organizer</p>
                <p className="font-medium">{selectedEvent.organizerName}</p>
                <p className="text-xs text-white/50">{selectedEvent.organizerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-white/60">Event Dates</p>
                <p className="text-sm">Start: {new Date(selectedEvent.startDate).toLocaleDateString()}</p>
                <p className="text-sm">End: {new Date(selectedEvent.endDate).toLocaleDateString()}</p>
                <p className="text-xs text-white/50">Ended {selectedEvent.daysEnded} days ago</p>
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-white mb-3">Financial Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-white/60">Tickets Sold:</span>
                  <span className="font-medium">{selectedEvent.totalTicketsSold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-white/60">Gross Revenue:</span>
                  <span className="font-medium">{formatCurrency(selectedEvent.grossRevenue, selectedEvent.currency as any)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-white/60">Platform Fee (5%):</span>
                  <span className="font-medium text-red-300">-{formatCurrency(selectedEvent.platformFee, selectedEvent.currency as any)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-white">Amount to Send:</span>
                  <span className="font-bold text-brand-300">{formatCurrency(selectedEvent.netRevenue, selectedEvent.currency as any)}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0a0a0a]  rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-white mb-2">Preferred Transfer</h4>
              <div className="flex items-center gap-2 text-sm">
                {selectedEvent.payoutMethod === 'bank_transfer' ? (
                  <Building2 className="w-4 h-4 text-white/60" />
                ) : selectedEvent.payoutMethod === 'mobile_money' ? (
                  <Smartphone className="w-4 h-4 text-white/60" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-300" />
                )}
                <span className={selectedEvent.payoutMethod ? 'text-white' : 'text-red-300'}>
                  {getPayoutMethodLabel(selectedEvent.payoutMethod)}
                </span>
              </div>
              {!selectedEvent.payoutMethod && (
                <p className="mt-2 text-xs text-white/60">
                  This organizer has no Haiti payout method on file yet.
                </p>
              )}
            </div>

            {selectedEvent.payoutMethod === 'bank_transfer' && hasBankDetails(selectedEvent.bankInfo) && (
              <div className="rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <><Building2 className="w-5 h-5" /> Bank Account Details</>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Account Name:</span>
                    <span className="font-medium">{selectedEvent.bankInfo?.accountName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Account Number:</span>
                    {(() => {
                      const value =
                        selectedEvent.bankInfo?.accountNumberFull ||
                        selectedEvent.bankInfo?.accountNumber ||
                        ''

                      if (!value) return <span className="font-mono font-medium">N/A</span>

                      return (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(value)}
                          className="font-mono font-medium inline-flex items-center gap-2 text-brand-300 hover:text-brand-300"
                          title="Click to copy"
                        >
                          <span>{value}</span>
                          <Copy className="w-4 h-4" />
                          {copiedValue === value && (
                            <span className="text-xs text-white/60">Copied</span>
                          )}
                        </button>
                      )
                    })()}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Bank Name:</span>
                    <span className="font-medium">{selectedEvent.bankInfo?.bankName || 'N/A'}</span>
                  </div>
                  {selectedEvent.bankInfo?.routingNumber && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Routing Number:</span>
                      <span className="font-mono font-medium">{selectedEvent.bankInfo.routingNumber}</span>
                    </div>
                  )}
                  {selectedEvent.bankInfo?.swift && (
                    <div className="flex justify-between">
                      <span className="text-white/60">SWIFT:</span>
                      <span className="font-mono font-medium">{selectedEvent.bankInfo.swift}</span>
                    </div>
                  )}
                  {selectedEvent.bankInfo?.iban && (
                    <div className="flex justify-between">
                      <span className="text-white/60">IBAN:</span>
                      <span className="font-mono font-medium">{selectedEvent.bankInfo.iban}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedEvent.payoutMethod === 'mobile_money' && hasMobileDetails(selectedEvent.bankInfo) && (
              <div className="rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <><Smartphone className="w-5 h-5" /> Mobile Money Details</>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Mobile Number:</span>
                    <span className="font-mono font-medium">{selectedEvent.bankInfo?.mobileNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Provider:</span>
                    <span className="font-medium">{selectedEvent.bankInfo?.provider || 'N/A'}</span>
                  </div>
                  {selectedEvent.bankInfo?.mobileAccountName && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Account Name:</span>
                      <span className="font-medium">{selectedEvent.bankInfo.mobileAccountName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2  rounded-lg hover:bg-white/[0.04]"
              >
                Close
              </button>
              {selectedEvent.payoutEligible && !selectedEvent.hasPendingPayout && (
                <button
                  onClick={() => initiatePayoutRequest(selectedEvent)}
                  className="flex-1 px-4 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 font-medium"
                >
                  Create Payout Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
