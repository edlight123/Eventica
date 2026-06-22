'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Payout } from '@/lib/firestore/payout'
import { StatTile, EmptyState } from '@/components/ui/kit'
import { Clock, Coins, Wallet } from 'lucide-react'

interface PayoutDashboardProps {
  initialBalance: {
    available: number
    pending: number
    nextPayoutDate: string | null
    totalEarnings: number
    currency: string
  }
  initialPayouts: Payout[]
  organizerId: string
}

export default function PayoutDashboard({
  initialBalance,
  initialPayouts,
  organizerId,
}: PayoutDashboardProps) {
  const { t } = useTranslation('organizer')
  const [balance, setBalance] = useState(initialBalance)
  const [payouts, setPayouts] = useState(initialPayouts)
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const formatCurrency = (cents: number, currency: string = 'HTG') => {
    const amount = (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return currency === 'HTG' ? `HTG ${amount}` : `$${amount}`
  }

  const handleRequestPayout = async () => {
    if (balance.available < 5000) {
      setError(`Minimum payout is ${formatCurrency(5000, balance.currency)}`)
      return
    }

    setIsRequesting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/organizer/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to request payout')
      }

      setSuccess('Payout request submitted successfully! We will process it on the next scheduled date.')
      
      // Refresh data
      const balanceResponse = await fetch('/api/organizer/balance')
      if (balanceResponse.ok) {
        const newBalance = await balanceResponse.json()
        setBalance(newBalance)
      }

      const payoutsResponse = await fetch('/api/organizer/payouts')
      if (payoutsResponse.ok) {
        const newPayouts = await payoutsResponse.json()
        setPayouts(newPayouts)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRequesting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-brand-50 text-brand-700',
      processing: 'bg-brand-100 text-brand-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Available Balance */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 md:p-6 border-l-4 border-brand-600">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <Wallet className="h-4 w-4" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('payouts_page.available_balance')}</p>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(balance.available, balance.currency)}
          </div>
          <div className="mt-4">
            <button
              onClick={handleRequestPayout}
              disabled={balance.available < 5000 || isRequesting}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                balance.available < 5000
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-700 text-white hover:bg-brand-800'
              }`}
            >
              {isRequesting ? t('payouts_page.processing') : t('payouts_page.request_payout')}
            </button>
            <p className="mt-2 text-xs text-gray-500 text-center">
              {t('payouts_page.minimum', { amount: formatCurrency(5000, balance.currency) })}
            </p>
          </div>
        </div>

        {/* Pending Balance */}
        <StatTile
          icon={Clock}
          label={t('payouts_page.pending_balance')}
          value={formatCurrency(balance.pending, balance.currency)}
          sublabel={
            balance.nextPayoutDate
              ? t('payouts_page.available_on', { date: new Date(balance.nextPayoutDate).toLocaleDateString() })
              : t('payouts_page.no_pending')
          }
        />

        {/* Total Earnings */}
        <StatTile
          icon={Coins}
          label={t('payouts_page.total_earnings')}
          value={formatCurrency(balance.totalEarnings, balance.currency)}
          sublabel={t('payouts_page.all_time')}
        />
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
        <h3 className="text-sm font-medium text-brand-900 mb-2">{t('payouts_page.how_payouts_work')}</h3>
        <ul className="text-sm text-brand-800 space-y-1 list-disc list-inside">
          <li>{t('payouts_page.funds_available_7_days')}</li>
          <li>{t('payouts_page.processed_friday_5pm')}</li>
          <li>{t('payouts_page.platform_fee_10_percent')}</li>
          <li>{t('payouts_page.payment_sent_to_method')}</li>
        </ul>
      </div>

      {/* Payout History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h2 className="font-display text-lg text-gray-900">{t('payouts_page.payout_history')}</h2>
        </div>

        {payouts.length === 0 ? (
          <EmptyState
            icon={Coins}
            title={t('payouts_page.no_payouts')}
            description={t('payouts_page.no_payouts_desc')}
            className="border-0"
          />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-gray-200">
              {payouts.map((payout) => (
                <div key={payout.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(payout.amount, balance.currency)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(payout.status)}`}>
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Method:</span>
                      <span className="text-gray-900">
                        {payout.method === 'mobile_money' ? 'MonCash/Natcash' : 'Bank Transfer'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Scheduled:</span>
                      <span className="text-gray-900">
                        {new Date(payout.scheduledDate).toLocaleDateString()}
                      </span>
                    </div>
                    {payout.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Completed:</span>
                        <span className="text-gray-900">
                          {new Date(payout.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('payouts_page.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('payouts_page.amount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('payouts_page.method')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payout.amount, balance.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.method === 'mobile_money' ? 'MonCash/Natcash' : 'Bank Transfer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(payout.status)}`}>
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(payout.scheduledDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.completedAt ? new Date(payout.completedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
