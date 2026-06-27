'use client'

import { useState } from 'react'
import { RecurrencePattern, RecurrenceRule, formatRecurrenceRule } from '@/lib/recurring-events'

interface RecurrenceRuleSelectorProps {
  value: RecurrenceRule
  onChange: (rule: RecurrenceRule) => void
  startDate: Date
}

export default function RecurrenceRuleSelector({
  value,
  onChange,
  startDate,
}: RecurrenceRuleSelectorProps) {
  const [pattern, setPattern] = useState<RecurrencePattern>(value.pattern || 'none')
  const [interval, setInterval] = useState(value.interval || 1)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value.daysOfWeek || [])
  const [dayOfMonth, setDayOfMonth] = useState(value.dayOfMonth || startDate.getDate())
  const [endType, setEndType] = useState<'date' | 'count' | 'never'>(
    value.endDate ? 'date' : value.occurrences ? 'count' : 'never'
  )
  const [endDate, setEndDate] = useState(value.endDate || '')
  const [occurrences, setOccurrences] = useState(value.occurrences || 10)

  const weekDays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ]

  const handlePatternChange = (newPattern: RecurrencePattern) => {
    setPattern(newPattern)
    updateRule({ pattern: newPattern })
  }

  const handleIntervalChange = (newInterval: number) => {
    setInterval(newInterval)
    updateRule({ interval: newInterval })
  }

  const toggleDayOfWeek = (day: number) => {
    const newDays = daysOfWeek.includes(day)
      ? daysOfWeek.filter(d => d !== day)
      : [...daysOfWeek, day].sort()
    
    setDaysOfWeek(newDays)
    updateRule({ daysOfWeek: newDays })
  }

  const handleDayOfMonthChange = (day: number) => {
    setDayOfMonth(day)
    updateRule({ dayOfMonth: day })
  }

  const handleEndTypeChange = (type: 'date' | 'count' | 'never') => {
    setEndType(type)
    updateRule({
      endDate: type === 'date' ? endDate : undefined,
      occurrences: type === 'count' ? occurrences : undefined,
    })
  }

  const handleEndDateChange = (date: string) => {
    setEndDate(date)
    updateRule({ endDate: date, occurrences: undefined })
  }

  const handleOccurrencesChange = (count: number) => {
    setOccurrences(count)
    updateRule({ occurrences: count, endDate: undefined })
  }

  const updateRule = (updates: Partial<RecurrenceRule>) => {
    const newRule: RecurrenceRule = {
      pattern,
      interval,
      daysOfWeek: pattern === 'weekly' ? daysOfWeek : undefined,
      dayOfMonth: pattern === 'monthly' ? dayOfMonth : undefined,
      endDate: endType === 'date' ? endDate : undefined,
      occurrences: endType === 'count' ? occurrences : undefined,
      ...updates,
    }
    onChange(newRule)
  }

  const currentRule: RecurrenceRule = {
    pattern,
    interval,
    daysOfWeek: pattern === 'weekly' ? daysOfWeek : undefined,
    dayOfMonth: pattern === 'monthly' ? dayOfMonth : undefined,
    endDate: endType === 'date' ? endDate : undefined,
    occurrences: endType === 'count' ? occurrences : undefined,
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Repeat Pattern
        </label>
        <select
          value={pattern}
          onChange={(e) => handlePatternChange(e.target.value as RecurrencePattern)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {pattern !== 'none' && (
        <>
          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat Every
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="99"
                value={interval}
                onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              />
              <span className="text-sm text-gray-600">
                {pattern === 'daily' && (interval === 1 ? 'day' : 'days')}
                {pattern === 'weekly' && (interval === 1 ? 'week' : 'weeks')}
                {pattern === 'monthly' && (interval === 1 ? 'month' : 'months')}
              </span>
            </div>
          </div>

          {/* Days of week (for weekly) */}
          {pattern === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat On
              </label>
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDayOfWeek(day.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      daysOfWeek.includes(day.value)
                        ? 'bg-teal-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-teal-500'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of month (for monthly) */}
          {pattern === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => handleDayOfMonthChange(parseInt(e.target.value) || 1)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                For months with fewer days, the last day will be used
              </p>
            </div>
          )}

          {/* End condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ends
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={endType === 'never'}
                  onChange={() => handleEndTypeChange('never')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">Never</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={endType === 'date'}
                  onChange={() => handleEndTypeChange('date')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">On</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  disabled={endType !== 'date'}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={endType === 'count'}
                  onChange={() => handleEndTypeChange('count')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">After</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={occurrences}
                  onChange={(e) => handleOccurrencesChange(parseInt(e.target.value) || 1)}
                  disabled={endType !== 'count'}
                  className="w-20 px-3 py-1 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                />
                <span className="text-sm text-gray-700">occurrences</span>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-900">
              {formatRecurrenceRule(currentRule)}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
