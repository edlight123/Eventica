'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Inbox } from 'lucide-react'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'

interface CategoryPageContentProps {
  category: string
  events: any[]
}

export default function CategoryPageContent({ category, events }: CategoryPageContentProps) {
  const { t } = useTranslation('common')
  const label = t(`categories.${category}`, { defaultValue: category })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      {/* Back link */}
      <Link
        href="/"
        className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        {t('common.back', { defaultValue: 'Back' })}
      </Link>

      {/* Header */}
      <header className="mb-7 md:mb-9">
        <p className="eyebrow text-brand-600">{t('events.eyebrow_browse')}</p>
        <h1 className="mt-1.5 font-display text-[clamp(28px,5vw,44px)] leading-[1.02] text-gray-900">
          {label}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 sm:text-[15px]">
          {events.length === 1
            ? t('events.event_found', { count: events.length })
            : t('events.events_found', { count: events.length })}
        </p>
      </header>

      {events.length > 0 ? (
        <>
          {/* Mobile: list rows */}
          <div className="space-y-3 md:hidden">
            {events.map((event) => (
              <EventCardHorizontal key={event.id} event={event} />
            ))}
          </div>
          {/* Desktop: poster grid */}
          <div className="hidden gap-5 md:grid md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-gray-200/80 bg-white px-6 py-16 text-center shadow-poster-sm sm:py-20">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <Inbox className="h-8 w-8" />
          </div>
          <h3 className="mt-5 font-display text-2xl text-gray-900">
            {t('events.no_category_events', { category: label })}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-gray-500">
            {t('events.check_back_or_explore')}
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-800"
          >
            {t('events.all_events')}
          </Link>
        </div>
      )}
    </div>
  )
}
