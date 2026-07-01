'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { DateFilter } from '@/lib/filters/types'
import { FilterChip } from '@/components/FilterChip'
import { InlineCalendar } from '@/components/ui/DateTimePickers'
import { X } from 'lucide-react'

interface DateChipsProps {
  currentDate: DateFilter
  /** When true, render only the chip row (no horizontal-scroll wrapper) for embedding in a shared strip. */
  bare?: boolean
}

export function DateChips({ currentDate, bare = false }: DateChipsProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showDatePicker, setShowDatePicker] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  // Simplified to the four highest-value quick filters (the full set lives in
  // the Filters modal). "Pick a date" opens a calendar modal.
  const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'any', label: t('filters.any_date') },
    { value: 'today', label: t('filters.today') },
    { value: 'this-weekend', label: t('filters.this_weekend') },
    { value: 'pick-date', label: t('filters.pick_date') },
  ]

  const handleDateChange = (date: DateFilter) => {
    const params = new URLSearchParams(searchParams)

    if (date === 'any') {
      params.delete('date')
      params.delete('pickedDate')
      router.push(`?${params.toString()}`)
    } else if (date === 'pick-date') {
      setShowDatePicker(true)
    } else {
      params.set('date', date)
      params.delete('pickedDate')
      router.push(`?${params.toString()}`)
    }
  }

  const applyPickedDate = (picked: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('date', 'pick-date')
    params.set('pickedDate', picked)
    router.push(`?${params.toString()}`)
    setShowDatePicker(false)
  }

  return (
    <>
      <div className={bare ? 'flex gap-2 min-w-max' : 'scrollbar-hide overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0'}>
        <div className="flex gap-2 min-w-max">
          {DATE_OPTIONS.map(option => {
            // Format the picked-date chip label safely.
            let label = option.label
            if (option.value === 'pick-date' && currentDate === 'pick-date' && searchParams.get('pickedDate')) {
              const pickedDate = searchParams.get('pickedDate')!
              const [year, month, day] = pickedDate.split('-')
              const date = new Date(Number(year), Number(month) - 1, Number(day))
              label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }

            return (
              <FilterChip
                key={option.value}
                label={label}
                active={currentDate === option.value}
                onClick={() => handleDateChange(option.value)}
              />
            )
          })}
        </div>
      </div>

      {/* Calendar modal */}
      {showDatePicker && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('filters.pick_date')}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setShowDatePicker(false)} aria-hidden="true" />
          <div className="relative z-[101] w-full max-w-sm rounded-t-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">{t('filters.pick_date')}</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <InlineCalendar
              value={searchParams.get('pickedDate') || ''}
              min={todayStr}
              onChange={applyPickedDate}
            />
          </div>
        </div>
      )}
    </>
  )
}
