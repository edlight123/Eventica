'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Search, MapPin, ChevronDown } from 'lucide-react'

interface HeroSectionProps {
  hasActiveFilters: boolean
  featuredEvents: any[]
  brandTagline?: string
}

export default function HeroSection({ hasActiveFilters }: HeroSectionProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    if (query.trim()) params.set('q', query.trim())
    else params.delete('q')
    router.push(`/?${params.toString()}`)
  }

  const SearchForm = (
    <form
      onSubmit={handleSearch}
      className="reveal reveal-3 mt-6 flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-gray-200/90 bg-white/90 p-2 shadow-poster-sm backdrop-blur-md"
    >
      <div className="flex select-none items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2.5 text-[13.5px] font-medium text-gray-700">
        <MapPin className="h-[15px] w-[15px] text-brand-600" />
        {t('common.all_locations', { defaultValue: 'All Haiti' })}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="flex min-w-[150px] flex-1 items-center gap-2 px-2">
        <Search className="h-[18px] w-[18px] shrink-0 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.search_placeholder')}
          className="w-full bg-transparent py-1 text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
          aria-label={t('common.search')}
        />
      </div>
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-700 active:scale-[0.98]"
      >
        {t('common.search')}
      </button>
    </form>
  )

  // Compact band when the visitor is actively filtering / searching
  if (hasActiveFilters) {
    return (
      <section className="relative overflow-hidden border-b border-gray-100">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f8f5ee] to-white" />
        <div className="mx-auto max-w-6xl px-5 pb-7 pt-8 sm:px-6 lg:px-8">
          <p className="eyebrow text-brand-600">{t('events.hero_eyebrow')}</p>
          <h1 className="mt-2.5 font-display text-[clamp(30px,5vw,46px)] leading-[1.0] text-gray-900">
            {t('events.find_perfect_event')}
          </h1>
          {SearchForm}
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden">
      {/* Warm paper canvas + soft brand glows */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f8f5ee] via-white to-white" />
      <div aria-hidden className="absolute right-[-12%] top-[-30%] -z-10 h-[460px] w-[460px] rounded-full bg-brand-300/25 blur-[130px]" />
      <div aria-hidden className="absolute left-[-10%] top-[-8%] -z-10 h-[320px] w-[320px] rounded-full bg-brand-200/30 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-5 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8">
        <p className="eyebrow reveal reveal-1 text-brand-600">{t('events.hero_eyebrow')}</p>

        <h1 className="reveal reveal-2 mt-3 max-w-[15ch] text-balance font-display text-[clamp(42px,7.5vw,78px)] leading-[0.94] text-gray-900">
          {t('events.hero_headline')}{' '}
          <span className="italic text-brand-600">{t('events.hero_headline_accent')}</span>.
        </h1>

        <p className="reveal reveal-3 mt-4 max-w-xl text-[15px] leading-relaxed text-gray-500 sm:text-lg">
          {t('events.hero_subtitle')}
        </p>

        {SearchForm}
      </div>
    </section>
  )
}
