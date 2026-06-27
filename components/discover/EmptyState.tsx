'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

interface EmptyStateProps {
  hasFilters: boolean
  countryName?: string
}

export function EmptyState({ hasFilters, countryName = 'your area' }: EmptyStateProps) {
  const router = useRouter()
  const { t } = useTranslation('common')

  if (!hasFilters) {
    // No events in user's country at all
    return (
      <div className="text-center py-16 sm:py-20 bg-white/5 border border-white/10 rounded-3xl shadow-sm">
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center">
            <MapPin className="w-10 h-10 text-brand-400" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">
          No events in {countryName} yet
        </h3>
        <p className="text-white/55 mb-8 max-w-md mx-auto px-4">
          We don&apos;t have any upcoming events in {countryName} right now.
          Check back soon or explore events in a different location.
        </p>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 hover:scale-[1.02] transition-all duration-200 font-semibold"
        >
          <MapPin className="w-5 h-5" />
          Change your location
        </Link>
      </div>
    )
  }

  const handleSuggestion = (action: 'any-date' | 'expand-location' | 'online') => {
    const params = new URLSearchParams(window.location.search)
    
    switch (action) {
      case 'any-date':
        params.delete('date')
        params.delete('pickedDate')
        break
      case 'expand-location':
        params.delete('commune')
        break
      case 'online':
        params.set('eventType', 'online')
        break
    }
    
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl shadow-sm">
      <h3 className="text-2xl font-bold text-white mb-3">
        {t('events.no_events')}
      </h3>
      <p className="text-white/55 mb-8">{t('common.try_different_search')}</p>

      <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto">
        <button
          onClick={() => handleSuggestion('any-date')}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium text-white/80 transition-colors"
        >
          {t('common.show_any_date')}
        </button>
        <button
          onClick={() => handleSuggestion('expand-location')}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium text-white/80 transition-colors"
        >
          {t('common.expand_location')}
        </button>
        <button
          onClick={() => handleSuggestion('online')}
          className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium text-white/80 transition-colors"
        >
          {t('common.show_online_events')}
        </button>
      </div>

      <button
        onClick={() => router.push('/discover')}
        className="mt-8 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-semibold"
      >
        {t('common.clear_all_filters')}
      </button>
    </div>
  )
}
