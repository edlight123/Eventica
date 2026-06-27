'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Database } from '@/types/database'
import { EventRail } from './EventRail'

type Event = Database['public']['Tables']['events']['Row']

interface EventsSectionProps {
  title: string
  description?: string
  emoji?: string
  events: Event[]
  seeAllLink?: string
  seeAllLabel?: string
}

export function EventsSection({ 
  title, 
  description, 
  emoji, 
  events, 
  seeAllLink, 
  seeAllLabel
}: EventsSectionProps) {
  const { t } = useTranslation('common')
  
  if (events.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-grotesk text-2xl sm:text-3xl font-bold lowercase tracking-tight text-white">
            {title}
          </h2>
          {description && (
            <p className="text-white/55 text-sm sm:text-base mt-1">{description}</p>
          )}
        </div>
        {seeAllLink && events.length >= 6 && (
          <Link
            href={seeAllLink}
            className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-semibold text-sm sm:text-base transition-colors whitespace-nowrap"
          >
            {seeAllLabel || t('common.seeAll')}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Horizontal rail: native scroll on mobile, chevron controls on desktop */}
      <EventRail events={events} />
    </section>
  )
}
