'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { CreditCard, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { formatMoneyFromCents } from '@/lib/money'

interface PayoutsWidgetProps {
  status: 'not-setup' | 'setup' | 'pending' | 'active'
  pendingBalance?: number
  currency?: string
  lastPayout?: {
    amount: number
    date: string
  }
  nextPayout?: {
    amount: number
    estimatedDate: string
  }
}

export function PayoutsWidget({ status, pendingBalance = 0, currency = 'HTG', lastPayout, nextPayout }: PayoutsWidgetProps) {
  const { t } = useTranslation('common')
  
  const getStatusInfo = () => {
    switch (status) {
      case 'not-setup':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          iconBg: 'bg-red-50',
          iconColor: 'text-red-600',
          title: t('payouts.not_setup_title'),
          description: t('payouts.not_setup_description'),
          ctaText: t('payouts.setup_payouts'),
          ctaHref: '/organizer/settings/payouts',
          ctaColor: 'bg-red-600 hover:bg-red-700'
        }
      case 'setup':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          iconBg: 'bg-green-50',
          iconColor: 'text-green-600',
          title: t('payouts.ready_title'),
          description: t('payouts.ready_description'),
          ctaText: t('payouts.view_settings'),
          ctaHref: '/organizer/settings/payouts',
          ctaColor: 'bg-green-600 hover:bg-green-700'
        }
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          iconBg: 'bg-yellow-50',
          iconColor: 'text-yellow-600',
          title: t('payouts.pending_title'),
          description: t('payouts.pending_description'),
          ctaText: t('payouts.view_details'),
          ctaHref: '/organizer/settings/payouts',
          ctaColor: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case 'active':
        return {
          icon: <DollarSign className="w-5 h-5" />,
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          title: t('payouts.active_title'),
          description: t('payouts.active_description'),
          ctaText: t('payouts.view_history'),
          ctaHref: '/organizer/settings/payouts/history',
          ctaColor: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-12 h-12 ${statusInfo.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <div className={statusInfo.iconColor}>
            {statusInfo.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl text-gray-900 mb-0.5">{statusInfo.title}</h3>
          <p className="text-sm text-gray-600">{statusInfo.description}</p>
        </div>
      </div>

      {/* Payout Details */}
      {status !== 'not-setup' && (
        <div className="space-y-4 mb-6">
          {/* Pending Balance */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{t('payouts.pending_balance')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatMoneyFromCents(pendingBalance, currency)}
            </p>
          </div>

          {/* Last Payout */}
          {lastPayout && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('payouts.last_payout')}</p>
                <p className="text-xs text-gray-600">
                  {new Date(lastPayout.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <p className="text-lg font-bold text-green-600">
                +{formatMoneyFromCents(lastPayout.amount, currency)}
              </p>
            </div>
          )}

          {/* Next Payout Estimate */}
          {nextPayout && nextPayout.amount > 0 && (
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('payouts.next_payout_est')}</p>
                <p className="text-xs text-gray-600">
                  {new Date(nextPayout.estimatedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <p className="text-lg font-bold text-blue-600">
                {formatMoneyFromCents(nextPayout.amount, currency)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CTA Button */}
      <Link
        href={statusInfo.ctaHref}
        className={`block w-full text-center px-4 py-3 ${statusInfo.ctaColor} text-white rounded-xl font-semibold transition-colors`}
      >
        {statusInfo.ctaText}
      </Link>

      {status !== 'not-setup' && (
        <p className="text-xs text-gray-500 text-center mt-3">
          {t('payouts.processing_time')}
        </p>
      )}
    </div>
  )
}
