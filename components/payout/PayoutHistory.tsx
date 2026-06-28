'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { DollarSign, RefreshCw, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StatusChip } from '@/components/ui/kit'
import type { Payout } from '@/lib/firestore/payout'

interface PayoutHistoryProps {
  payouts: Payout[]
  loading?: boolean
}

export function PayoutHistory({ payouts, loading }: PayoutHistoryProps) {
  const { t } = useTranslation('organizer')
  const [exporting, setExporting] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/organizer/export-payouts?format=csv')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export payouts')
    } finally {
      setExporting(false)
    }
  }

  const handleRetry = async (payoutId: string) => {
    setRetrying(payoutId)
    try {
      const response = await fetch('/api/organizer/retry-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error)
      }

      alert('Payout scheduled for retry!')
      window.location.reload()
    } catch (error: any) {
      console.error('Retry failed:', error)
      alert(error.message || 'Failed to retry payout')
    } finally {
      setRetrying(null)
    }
  }

  const formatCurrency = (amountInCents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountInCents / 100)
  }

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] rounded-2xl border-2 border-white/10 p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-6">{t('settings.payout_settings.payout_history')}</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/[0.06] rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/[0.06] rounded w-1/4" />
                  <div className="h-3 bg-white/[0.06] rounded w-1/3" />
                </div>
                <div className="h-6 bg-white/[0.06] rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!payouts || payouts.length === 0) {
    return (
      <div className="bg-[#0a0a0a] rounded-2xl border-2 border-white/10 p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-6">{t('settings.payout_settings.payout_history')}</h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-white/40" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">{t('settings.payout_settings.no_history')}</h4>
          <p className="text-white/65 max-w-md mx-auto">
            {t('settings.payout_settings.no_history_desc')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] rounded-2xl border-2 border-white/10 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">{t('settings.payout_settings.payout_history')}</h3>
        <button 
          onClick={handleExport}
          disabled={exporting || !payouts || payouts.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/[0.04] disabled:bg-[#0a0a0a] disabled:text-white/40 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export'}
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-white/10">
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Method</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/70">Status</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-white/70">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => (
              <tr key={payout.id} className="border-b border-white/10 hover:bg-[#0a0a0a] transition-colors">
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-white">
                    {new Date(payout.scheduledDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  {payout.completedAt && (
                    <div className="text-xs text-white/50 mt-0.5">
                      {formatDistanceToNow(new Date(payout.completedAt), { addSuffix: true })}
                    </div>
                  )}
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm font-bold text-white">
                    {formatCurrency(payout.amount)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-white/70 capitalize">
                    {payout.method.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-4 px-4"><StatusChip status={payout.status} /></td>
                <td className="py-4 px-4 text-right">
                  {payout.status === 'failed' && (
                    <button 
                      onClick={() => handleRetry(payout.id)}
                      disabled={retrying === payout.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:bg-white/[0.04] disabled:text-white/40 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${retrying === payout.id ? 'animate-spin' : ''}`} />
                      {retrying === payout.id ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-4">
        {payouts.map((payout) => (
          <div
            key={payout.id}
            className="p-4 border-2 border-white/10 rounded-xl hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-white mb-1">
                  {new Date(payout.scheduledDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                {payout.completedAt && (
                  <div className="text-xs text-white/50">
                    {formatDistanceToNow(new Date(payout.completedAt), { addSuffix: true })}
                  </div>
                )}
              </div>
              <StatusChip status={payout.status} />
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-white">
                {formatCurrency(payout.amount)}
              </span>
              <span className="text-sm text-white/65 capitalize">
                {payout.method.replace('_', ' ')}
              </span>
            </div>

            {payout.status === 'failed' && payout.failureReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                <p className="text-xs text-red-300">
                  <strong>Reason:</strong> {payout.failureReason}
                </p>
              </div>
            )}

            {payout.status === 'failed' && (
              <button 
                onClick={() => handleRetry(payout.id)}
                disabled={retrying === payout.id}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:bg-white/[0.04] disabled:text-white/40 disabled:cursor-not-allowed border-2 border-brand-600 disabled:border-white/10 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${retrying === payout.id ? 'animate-spin' : ''}`} />
                {retrying === payout.id ? 'Retrying...' : 'Retry Payout'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Load More */}
      {payouts.length >= 10 && (
        <div className="mt-6 text-center">
          <button className="px-6 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.04] rounded-xl transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
