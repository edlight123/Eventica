'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export default function PayoutSettingsHeader() {
  const { t } = useTranslation('organizer')

  return (
    <div className="bg-gradient-to-br from-brand-600 to-brand-700 border-b border-brand-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link href="/organizer/settings" className="inline-flex items-center gap-2 px-4 py-2 text-brand-100 hover:text-white hover:bg-brand-700 rounded-lg transition-colors text-sm font-medium">
            <span>←</span>
            <span>{t('settings.payout_settings.back_to_settings')}</span>
          </Link>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{t('settings.payout_settings.title')}</h1>
            <p className="text-brand-100 text-sm sm:text-base max-w-2xl">
              {t('settings.payout_settings.subtitle')}
            </p>
          </div>
          <div className="hidden lg:block w-24 h-24 bg-brand-500/30 rounded-2xl flex-shrink-0" />
        </div>
      </div>
    </div>
  )
}
