'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import type { DateFilter } from '@/lib/filters/types'
import { DateChips } from './DateChips'
import { CategoryChips } from './CategoryChips'

interface DiscoverFilterChipsStripProps {
  currentDate: DateFilter
  selectedCategories: string[]
}

/**
 * Compact, horizontally-scrolling strip that keeps the date + category quick
 * filters reachable at all times. Rendered inside the sticky discover header so
 * users can re-filter while scrolling the rails below.
 */
export function DiscoverFilterChipsStrip({
  currentDate,
  selectedCategories,
}: DiscoverFilterChipsStripProps) {
  const { t } = useTranslation('common')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="scrollbar-hide flex items-center gap-3 overflow-x-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <span className="sr-only">{t('common.when')}</span>
        <DateChips currentDate={currentDate} bare />
        <div className="h-6 w-px shrink-0 bg-gray-200" aria-hidden="true" />
        <span className="sr-only">{t('common.categories')}</span>
        <CategoryChips selectedCategories={selectedCategories} bare />
      </div>
    </div>
  )
}
