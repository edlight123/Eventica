'use client'

import { differenceInHours, differenceInMinutes, differenceInDays, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { Clock, Flame, Calendar } from 'lucide-react'

interface EventTimingBadgeProps {
  startDateTime: string
}

export function EventTimingBadge({ startDateTime }: EventTimingBadgeProps) {
  const startDate = new Date(startDateTime)
  const now = new Date()

  // Don't show if event has passed
  if (isPast(startDate)) {
    return null
  }

  const hoursUntil = differenceInHours(startDate, now)
  const minutesUntil = differenceInMinutes(startDate, now)
  const daysUntil = differenceInDays(startDate, now)

  // Tonight (same day, within 12 hours)
  if (isToday(startDate) && hoursUntil <= 12) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-700 text-white rounded-full text-sm font-semibold shadow-lg animate-pulse">
        <Flame className="w-4 h-4" />
        <span>Tonight</span>
        {hoursUntil > 0 && (
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            Starts in {hoursUntil}h
          </span>
        )}
        {hoursUntil === 0 && minutesUntil > 0 && (
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            Starts in {minutesUntil}m
          </span>
        )}
      </div>
    )
  }

  // Tomorrow
  if (isTomorrow(startDate)) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-700 text-white rounded-full text-sm font-semibold shadow-lg">
        <Calendar className="w-4 h-4" />
        <span>Tomorrow</span>
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
          in {hoursUntil}h
        </span>
      </div>
    )
  }

  // This weekend
  if (isThisWeek(startDate) && daysUntil <= 7) {
    const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' })
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-700 text-white rounded-full text-sm font-semibold shadow-lg">
        <Calendar className="w-4 h-4" />
        <span>This {dayName}</span>
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
          in {daysUntil}d
        </span>
      </div>
    )
  }

  // Coming soon (within 14 days)
  if (daysUntil <= 14) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-700 text-white rounded-full text-sm font-semibold shadow-md">
        <Clock className="w-4 h-4" />
        <span>Coming Soon</span>
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
          in {daysUntil}d
        </span>
      </div>
    )
  }

  return null
}
