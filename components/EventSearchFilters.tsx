'use client'

import { SlidersHorizontal } from 'lucide-react'
import { EventFilters } from '@/lib/filters/types'
import { countActiveFilters } from '@/lib/filters/utils'
import { useTranslation } from 'react-i18next'

interface EventSearchFiltersProps {
  filters: EventFilters
  onOpenFilters: () => void
}

export default function EventSearchFilters({ filters, onOpenFilters }: EventSearchFiltersProps) {
  const { t } = useTranslation('common')
  const activeCount = countActiveFilters(filters)
  
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={onOpenFilters}
        className="hover-lift inline-flex items-center gap-2 rounded-xl border border-white/10/80 bg-[#0a0a0a] px-4 py-2.5 font-semibold text-white/70 shadow-poster-sm hover:border-brand-200 hover:text-brand-300"
      >
        <SlidersHorizontal className="h-[18px] w-[18px]" />
        <span>{t('filters.filters')}</span>
        {activeCount > 0 && (
          <span className="ml-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>
      
      {activeCount > 0 && (
        <p className="eyebrow text-[11px] text-white/50">
          {activeCount} {t('filter')}{activeCount !== 1 ? 's' : ''} {t('active')}
        </p>
      )}
    </div>
  )
}
