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
      <div className="rounded-2xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-300" />
          <div>
            <h3 className="font-display text-xl text-white mb-1">{t('organizer.action_center.all_caught_up')}</h3>
            <p className="text-sm text-emerald-300">{t('organizer.action_center.no_action_items')}</p>
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
        return { bg: '', border: 'border-brand-500/30', text: 'text-brand-300', icon: 'text-brand-300', btn: 'bg-brand-600 hover:bg-brand-700' }
      case 'low-sales':
        return { bg: '', border: 'border-amber-500/30', text: 'text-white', icon: 'text-amber-300', btn: 'bg-amber-600 hover:bg-amber-700' }
      case 'payout':
        return { bg: '', border: 'border-brand-500/30', text: 'text-brand-300', icon: 'text-brand-300', btn: 'bg-brand-600 hover:bg-brand-700' }
      case 'verification':
        return { bg: '', border: 'border-amber-500/30', text: 'text-white', icon: 'text-amber-300', btn: 'bg-amber-600 hover:bg-amber-700' }
      default:
        return { bg: 'bg-[#0a0a0a]', border: 'border-white/10', text: 'text-white', icon: 'text-white/60', btn: 'bg-gray-600 hover:bg-gray-700' }
    }
  }

  return (
    <div className="bg-[#141414] rounded-2xl shadow-soft border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-300" />
        </div>
        <div>
          <h3 className="font-display text-xl text-white">{t('organizer.action_center.title')}</h3>
          <p className="text-sm text-white/60">
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
                <div className={`w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
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
