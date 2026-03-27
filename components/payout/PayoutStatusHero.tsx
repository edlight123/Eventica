'use client'

import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { PayoutStatus } from '@/lib/firestore/payout'

interface PayoutStatusHeroProps {
  status: PayoutStatus
  reason?: string
}

export function PayoutStatusHero({ status, reason }: PayoutStatusHeroProps) {
  const { t } = useTranslation('organizer')
  
  const getStatusConfig = () => {
    switch (status) {
      case 'not_setup':
        return {
          icon: <AlertCircle className="w-8 h-8" />,
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          bg: 'from-orange-50 to-orange-100',
          border: 'border-orange-200',
          title: t('settings.payout_settings.status_not_setup'),
          description: t('settings.payout_settings.status_not_setup_desc'),
          showCta: false
        }
      case 'pending_verification':
        return {
          icon: <Clock className="w-8 h-8" />,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          bg: 'from-blue-50 to-blue-100',
          border: 'border-blue-200',
          title: t('settings.payout_settings.status_pending'),
          description: reason || t('settings.payout_settings.status_pending_desc'),
          showCta: true,
          ctaText: t('settings.payout_settings.view_status'),
          ctaHref: '#verification',
          ctaColor: 'bg-blue-600 hover:bg-blue-700'
        }
      case 'active':
        return {
          icon: <CheckCircle className="w-8 h-8" />,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          bg: 'from-green-50 to-green-100',
          border: 'border-green-200',
          title: t('settings.payout_settings.status_active'),
          description: t('settings.payout_settings.status_active_desc'),
          showCta: true,
          ctaText: t('settings.payout_settings.manage_settings'),
          ctaHref: '#method',
          ctaColor: 'bg-green-600 hover:bg-green-700'
        }
      case 'on_hold':
        return {
          icon: <XCircle className="w-8 h-8" />,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          bg: 'from-red-50 to-red-100',
          border: 'border-red-200',
          title: t('settings.payout_settings.status_hold'),
          description: reason || t('settings.payout_settings.status_hold_desc'),
          showCta: true,
          ctaText: t('settings.payout_settings.contact_support'),
          ctaHref: 'mailto:support@joineventica.com',
          ctaColor: 'bg-red-600 hover:bg-red-700'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`bg-gradient-to-br ${config.bg} rounded-2xl border-2 ${config.border} p-6 md:p-8`}>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className={`${config.iconBg} rounded-2xl p-4 ${config.iconColor} flex-shrink-0`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h2>
          <p className="text-gray-700 leading-relaxed">{config.description}</p>
        </div>
        {config.showCta && (
          <a
            href={config.ctaHref}
            className={`${config.ctaColor} text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all whitespace-nowrap`}
          >
            {config.ctaText}
          </a>
        )}
      </div>
    </div>
  )
}
