'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { AlertCircle, FileText, TrendingUp, CreditCard, ShieldCheck } from 'lucide-react'

interface Alert {
  id: string
  type: 'draft' | 'low-sales' | 'payout' | 'verification'
  title: string
  description: string
  ctaText: string
  ctaHref: string
}

interface ActionCenterProps {
  alerts: Alert[]
}

export function ActionCenter({ alerts }: ActionCenterProps) {
  const { t } = useTranslation('common')
  
  if (alerts.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl border border-green-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-green-900 text-lg mb-1">{t('organizer.action_center.all_caught_up')}</h3>
            <p className="text-sm text-green-700">{t('organizer.action_center.no_action_items')}</p>
          </div>
        </div>
      </div>
    )
  }

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'draft':
        return <FileText className="w-5 h-5" />
      case 'low-sales':
        return <TrendingUp className="w-5 h-5" />
      case 'payout':
        return <CreditCard className="w-5 h-5" />
      case 'verification':
        return <ShieldCheck className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getColor = (type: Alert['type']) => {
    switch (type) {
      case 'draft':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' }
      case 'low-sales':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700' }
      case 'payout':
        return { bg: 'bg-brand-50', border: 'border-brand-100', text: 'text-brand-900', icon: 'text-brand-600', btn: 'bg-brand-600 hover:bg-brand-700' }
      case 'verification':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', icon: 'text-yellow-600', btn: 'bg-yellow-600 hover:bg-yellow-700' }
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', icon: 'text-gray-600', btn: 'bg-gray-600 hover:bg-gray-700' }
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{t('organizer.action_center.title')}</h3>
          <p className="text-sm text-gray-600">
            {alerts.length} {alerts.length !== 1 ? t('organizer.action_center.action_items_plural') : t('organizer.action_center.action_items')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const colors = getColor(alert.type)
          return (
            <div
              key={alert.id}
              className={`${colors.bg} ${colors.border} border rounded-xl p-4`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
                  {getIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold ${colors.text} mb-1`}>{alert.title}</h4>
                  <p className={`text-sm ${colors.text} opacity-80 mb-3`}>{alert.description}</p>
                  <Link
                    href={alert.ctaHref}
                    className={`inline-flex items-center gap-2 px-4 py-2 ${colors.btn} text-white rounded-lg font-semibold transition-colors text-sm`}
                  >
                    {alert.ctaText}
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
