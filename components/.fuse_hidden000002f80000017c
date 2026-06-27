'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const dateRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Tomorrow', value: 'tomorrow' },
  { label: 'This Weekend', value: 'weekend' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Dates', value: '' },
]

export default function DateFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentDate = searchParams.get('date') || ''

  const handleDateChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (value) {
      params.set('date', value)
    } else {
      params.delete('date')
    }
    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }

  return (
    <div className="flex flex-wrap gap-2">
      {dateRanges.map((range) => (
        <button
          key={range.value}
          onClick={() => handleDateChange(range.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            currentDate === range.value
              ? 'bg-teal-700 text-white shadow-md'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-teal-700 hover:text-teal-700'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
