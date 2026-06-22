'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { EarningsSummary } from '@/types/earnings'
import { StatTile } from '@/components/ui/kit'
import { PayoutRequestModal } from '@/components/organizer/PayoutRequestModal'
import { DollarSign, TrendingUp, Wallet, ArrowDownCircle } from 'lucide-react'

interface EarningsViewProps {
  summary: EarningsSummary
  organizerId: string
}

export default function EarningsView({ summary, organizerId }: EarningsViewProps) {
  const [filter, setFilter] = useState<'all' | 'ready' | 'pending' | 'locked'>('all')
  const [payoutOpen, setPayoutOpen] = useState(false)

  const formatCurrency = (cents: number, currencyOverride?: 'HTG' | 'USD' | 'CAD') => {
    const amount = cents / 100

    const currency =
      currencyOverride ||
      (summary.currency === 'HTG' || summary.currency === 'USD' || summary.currency === 'CAD' ? summary.currency : 'USD')

    if (currency === 'HTG') {
      const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      return `HTG ${formatted}`
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      locked: 'bg-gray-100 text-gray-800',
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  const filteredEvents = filter === 'all' 
    ? summary.events 
    : summary.events.filter(e => e.settlementStatus === filter)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={DollarSign}
          label="Gross Sales"
          sublabel="All time"
          value={
            summary.currency === 'mixed' && summary.totalsByCurrency ? (
              <span className="block space-y-1">
                <span className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">USD</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(summary.totalsByCurrency.USD?.totalGrossSales ?? 0, 'USD')}
                  </span>
                </span>
                <span className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">HTG</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(summary.totalsByCurrency.HTG?.totalGrossSales ?? 0, 'HTG')}
                  </span>
                </span>
              </span>
            ) : (
              formatCurrency(summary.totalGrossSales)
            )
          }
        />

        <StatTile
          icon={TrendingUp}
          label="Net Amount"
          sublabel="After fees"
          value={
            summary.currency === 'mixed' && summary.totalsByCurrency ? (
              <span className="block space-y-1">
                <span className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">USD</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(summary.totalsByCurrency.USD?.totalNetAmount ?? 0, 'USD')}
                  </span>
                </span>
                <span className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">HTG</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(summary.totalsByCurrency.HTG?.totalNetAmount ?? 0, 'HTG')}
                  </span>
                </span>
              </span>
            ) : (
              formatCurrency(summary.totalNetAmount)
            )
          }
        />

        <StatTile
          icon={Wallet}
          label="Available"
          sublabel="Ready to withdraw"
          className="border-l-4 border-green-600"
          value={
            summary.currency === 'mixed' && summary.totalsByCurrency ? (
              <span className="block space-y-1">
                <span className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">USD</span>
                  <span className="text-lg sm:text-xl font-bold text-green-600">
                    {formatCurrency(summary.totalsByCurrency.USD?.totalAvailableToWithdraw ?? 0, 'USD')}
                  </span>
                </span>
                <span className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">HTG</span>
                  <span className="text-lg sm:text-xl font-bold text-green-600">
                    {formatCurrency(summary.totalsByCurrency.HTG?.totalAvailableToWithdraw ?? 0, 'HTG')}
                  </span>
                </span>
              </span>
            ) : (
              <span className="text-green-600">{formatCurrency(summary.totalAvailableToWithdraw)}</span>
            )
          }
        />

        <StatTile
          icon={ArrowDownCircle}
          label="Withdrawn"
          sublabel="Total paid out"
          value={
            summary.currency === 'mixed' && summary.totalsByCurrency ? (
              <span className="block space-y-1">
                <span className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">USD</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(summary.totalsByCurrency.USD?.totalWithdrawn ?? 0, 'USD')}
                  </span>
                </span>
                <span className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">HTG</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrency(summary.totalsByCurrency.HTG?.totalWithdrawn ?? 0, 'HTG')}
                  </span>
                </span>
              </span>
            ) : (
              formatCurrency(summary.totalWithdrawn)
            )
          }
        />
      </div>

      {/* Fee Breakdown Info */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-brand-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-brand-900 mb-1">Fee Structure</h3>
            <div className="text-xs sm:text-sm text-brand-800 space-y-1">
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span className="font-medium">10% of ticket sales</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fee:</span>
                <span className="font-medium">2.9% + $0.30 per transaction</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-brand-200">
                <span>Total Fees Paid:</span>
                <span className="font-semibold">
                  {summary.currency === 'mixed' && summary.totalsByCurrency ? (
                    <span className="inline-flex flex-col items-end gap-0.5">
                      <span>{formatCurrency((summary.totalsByCurrency.USD?.totalPlatformFees ?? 0) + (summary.totalsByCurrency.USD?.totalProcessingFees ?? 0), 'USD')}</span>
                      <span>{formatCurrency((summary.totalsByCurrency.HTG?.totalPlatformFees ?? 0) + (summary.totalsByCurrency.HTG?.totalProcessingFees ?? 0), 'HTG')}</span>
                    </span>
                  ) : (
                    formatCurrency(summary.totalPlatformFees + summary.totalProcessingFees)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Filter Tabs */}
        <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Events</div>
              <div className="text-xs text-gray-500">Filter by settlement status</div>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {(['all', 'ready', 'pending', 'locked'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition whitespace-nowrap ${
                    filter === status
                      ? 'bg-brand-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile View - Cards */}
        <div className="sm:hidden divide-y divide-gray-200">
          {filteredEvents.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-gray-500">No events found for this filter</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.eventId} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{event.eventTitle}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusBadge(
                      event.settlementStatus
                    )}`}
                  >
                    {event.settlementStatus}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-gray-500">Gross Sales</div>
                    <div className="font-medium">
                      {formatCurrency(event.grossSales, event.currency || undefined)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Net Amount</div>
                    <div className="font-medium">
                      {formatCurrency(event.netAmount, event.currency || undefined)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Available</div>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(event.availableToWithdraw, event.currency || undefined)}
                    </div>
                  </div>
                  <div className="flex items-end justify-end">
                    <Link
                      href={`/organizer/events/${event.eventId}/earnings`}
                      className="text-teal-600 hover:text-teal-800 font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Sales
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="mt-4 text-gray-500">No events found for this filter</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.eventId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{event.eventTitle}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium whitespace-nowrap">
                      {formatCurrency(event.grossSales, event.currency || undefined)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium whitespace-nowrap">
                      {formatCurrency(event.netAmount, event.currency || undefined)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600 whitespace-nowrap">
                      {formatCurrency(event.availableToWithdraw, event.currency || undefined)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                          event.settlementStatus
                        )}`}
                      >
                        {event.settlementStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/organizer/events/${event.eventId}/earnings`}
                        className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      {(() => {
        const anyCurrencyAboveMinimum = summary.currency === 'mixed' && summary.totalsByCurrency
          ? (summary.totalsByCurrency.USD?.totalAvailableToWithdraw ?? 0) > 5000 || (summary.totalsByCurrency.HTG?.totalAvailableToWithdraw ?? 0) > 5000
          : summary.totalAvailableToWithdraw > 5000

        if (!anyCurrencyAboveMinimum) return null

        const availableLabel = summary.currency === 'mixed' && summary.totalsByCurrency
          ? `${formatCurrency(summary.totalsByCurrency.USD?.totalAvailableToWithdraw ?? 0, 'USD')} • ${formatCurrency(summary.totalsByCurrency.HTG?.totalAvailableToWithdraw ?? 0, 'HTG')}`
          : formatCurrency(summary.totalAvailableToWithdraw)

        return (
        <>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl text-gray-900">Ready to Withdraw</h3>
              <p className="text-sm text-gray-600 mt-1">
                You have {availableLabel} available to withdraw
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPayoutOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-brand-700 text-white font-semibold rounded-lg hover:bg-brand-800 transition text-center"
            >
              Request Payout
            </button>
          </div>
        </div>
        <PayoutRequestModal
          open={payoutOpen}
          onClose={() => setPayoutOpen(false)}
          availableLabel={availableLabel}
        />
        </>
        )
      })()}
    </div>
  )
}
