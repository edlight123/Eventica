'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { DateFilter } from '@/lib/filters/types'
import { FilterChip } from '@/components/FilterChip'
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
  const [selectedDate, setSelectedDate] = useState('')

  const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'any', label: t('filters.any_date') },
    { value: 'today', label: t('filters.today') },
    { value: 'tomorrow', label: t('filters.tomorrow') },
    { value: 'this-week', label: t('filters.this_week') },
    { value: 'this-weekend', label: t('filters.this_weekend') },
    { value: 'pick-date', label: t('filters.pick_date') }
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

  const handleDatePickerSubmit = () => {
    if (!selectedDate) return
    
    const params = new URLSearchParams(searchParams)
    params.set('date', 'pick-date')
    params.set('pickedDate', selectedDate)
    router.push(`?${params.toString()}`)
    setShowDatePicker(false)
  }

  const handleDatePickerClose = () => {
    setShowDatePicker(false)
    setSelectedDate('')
  }

  return (
    <>
      <div className={bare ? 'flex gap-2 min-w-max' : 'scrollbar-hide overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0'}>
        <div className="flex gap-2 min-w-max">
          {DATE_OPTIONS.map(option => {
            // Format picked date label safely
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

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Pick a date</h3>
              <button
                onClick={handleDatePickerClose}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />

              <div className="flex gap-3">
                <button
                  onClick={handleDatePickerClose}
                  className="flex-1 px-4 py-3 border border-white/15 rounded-lg font-medium text-white/80 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDatePickerSubmit}
                  disabled={!selectedDate}
                  className="flex-1 px-4 py-3 bg-brand-700 text-white rounded-lg font-medium hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
