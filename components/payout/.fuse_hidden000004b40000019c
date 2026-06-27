'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function FeesAndRulesCard() {
  const { t } = useTranslation('organizer')
  const [currency, setCurrency] = useState<'USD' | 'HTG'>('USD')
  const [location, setLocation] = useState<'haiti' | 'abroad'>('haiti')

  // Fee structures based on currency and location
  const getFeeStructure = () => {
    if (currency === 'USD' && location === 'haiti') {
      return {
        platformFee: '5%',
        processingFee: '2.9% + $0.30',
        ticketPrice: '$100.00',
        platformFeeAmount: '-$5.00',
        processingFeeAmount: '-$3.20',
        payout: '$91.80',
      }
    } else if (currency === 'USD' && location === 'abroad') {
      return {
        platformFee: '7%',
        processingFee: '3.9% + $0.50',
        ticketPrice: '$100.00',
        platformFeeAmount: '-$7.00',
        processingFeeAmount: '-$4.40',
        payout: '$88.60',
      }
    } else if (currency === 'HTG' && location === 'haiti') {
      return {
        platformFee: '5%',
        processingFee: '2.5% + 15 HTG',
        ticketPrice: '5,000 HTG',
        platformFeeAmount: '-250 HTG',
        processingFeeAmount: '-140 HTG',
        payout: '4,610 HTG',
      }
    } else {
      // HTG abroad
      return {
        platformFee: '7%',
        processingFee: '3.5% + 20 HTG',
        ticketPrice: '5,000 HTG',
        platformFeeAmount: '-350 HTG',
        processingFeeAmount: '-195 HTG',
        payout: '4,455 HTG',
      }
    }
  }

  const fees = getFeeStructure()

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Info className="w-6 h-6 text-brand-600" />
        <h3 className="text-xl font-bold text-gray-900">{t('settings.payout_settings.fees_rules')}</h3>
      </div>

      {/* Currency and Location Selector */}
      <div className="mb-6 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.payout_settings.currency')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency('USD')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                currency === 'USD'
                  ? 'bg-brand-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency('HTG')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                currency === 'HTG'
                  ? 'bg-brand-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              HTG
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.payout_settings.account_location')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLocation('haiti')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                location === 'haiti'
                  ? 'bg-brand-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('settings.payout_settings.haiti')}
            </button>
            <button
              onClick={() => setLocation('abroad')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                location === 'abroad'
                  ? 'bg-brand-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('settings.payout_settings.abroad')}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Platform Fee */}
        <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="font-semibold text-brand-900">{t('settings.payout_settings.platform_fee')}</h4>
            <span className="text-2xl font-bold text-brand-700">{fees.platformFee}</span>
          </div>
          <p className="text-sm text-brand-800">
            {location === 'abroad' 
              ? t('settings.payout_settings.platform_fee_abroad')
              : t('settings.payout_settings.platform_fee_haiti')}
          </p>
        </div>

        {/* Processing Fee */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="font-semibold text-gray-900">{t('settings.payout_settings.processing_fee')}</h4>
            <span className="text-lg font-bold text-gray-700">{fees.processingFee}</span>
          </div>
          <p className="text-sm text-gray-600">
            {t('settings.payout_settings.processing_fee_desc')}
          </p>
        </div>

        {/* Payout Rules */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">{t('settings.payout_settings.payout_schedule')}</h4>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-brand-600 font-bold mt-0.5">•</span>
              <span>{t('settings.payout_settings.schedule_friday')} <strong>{t('settings.payout_settings.friday_5pm')}</strong></span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-brand-600 font-bold mt-0.5">•</span>
              <span>{t('settings.payout_settings.minimum_payout')} <strong>{currency === 'USD' ? '$50.00' : '2,500 HTG'}</strong></span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-brand-600 font-bold mt-0.5">•</span>
              <span>{t('settings.payout_settings.bank_transfer_time')} <strong>{t('settings.payout_settings.bank_days')}</strong> {t('settings.payout_settings.bank_arrival')}</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-brand-600 font-bold mt-0.5">•</span>
              <span>{t('settings.payout_settings.mobile_money_time')} <strong>{t('settings.payout_settings.mobile_instant')}</strong></span>
            </li>
          </ul>
        </div>

        {/* Example Calculation */}
        <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl">
          <h4 className="font-semibold text-brand-900 mb-3">{t('settings.payout_settings.example_calc')}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-brand-800">
              <span>{t('settings.payout_settings.ticket_price')}</span>
              <span className="font-mono">{fees.ticketPrice}</span>
            </div>
            <div className="flex justify-between text-brand-700">
              <span>{t('settings.payout_settings.platform_fee')} ({fees.platformFee}):</span>
              <span className="font-mono">{fees.platformFeeAmount}</span>
            </div>
            <div className="flex justify-between text-brand-700">
              <span>{t('settings.payout_settings.processing_fee')} ({fees.processingFee}):</span>
              <span className="font-mono">{fees.processingFeeAmount}</span>
            </div>
            <div className="h-px bg-brand-300 my-2" />
            <div className="flex justify-between text-brand-900 font-bold">
              <span>{t('settings.payout_settings.your_payout')}</span>
              <span className="font-mono">{fees.payout}</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>{t('settings.payout_settings.note')}</strong> {t('settings.payout_settings.note_desc')}
          </p>
        </div>
      </div>
    </div>
  )
}
