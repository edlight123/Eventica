'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns'
import { enUS, fr, ht, type Locale } from 'date-fns/locale'

const LOCALES: Record<string, Locale> = { en: enUS, fr, ht }

function useDateLocale(): Locale {
  const { i18n } = useTranslation()
  const lang = (i18n?.language || 'en').slice(0, 2)
  return LOCALES[lang] || enUS
}

/** Parse a 'yyyy-MM-dd' string into a local Date (no timezone drift). */
function parseDateValue(value?: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Close popover on outside click / Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

const triggerBase =
  'inline-flex items-center gap-2 rounded-lg border bg-[#0a0a0a] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-brand-400/40'

// ---------------------------------------------------------------------------
// DatePicker
// ---------------------------------------------------------------------------

export function DatePicker({
  value,
  onChange,
  min,
  invalid = false,
  placeholder = 'Select date',
  className = '',
}: {
  value: string // 'yyyy-MM-dd'
  onChange: (value: string) => void
  min?: string // 'yyyy-MM-dd'
  invalid?: boolean
  placeholder?: string
  className?: string
}) {
  const locale = useDateLocale()
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))

  const selected = parseDateValue(value)
  const minDate = parseDateValue(min)
  const [view, setView] = useState<Date>(() => selected || new Date())

  useEffect(() => {
    if (open && selected) setView(selected)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(view), { locale })
    const end = endOfWeek(endOfMonth(view), { locale })
    const days = eachDayOfInterval({ start, end })
    const out: Date[][] = []
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7))
    return out
  }, [view, locale])

  const weekdayLabels = useMemo(
    () => weeks[0]?.map((d) => format(d, 'EEEEEE', { locale })) ?? [],
    [weeks, locale]
  )

  const label = selected
    ? `${format(selected, 'EEE', { locale })}, ${format(selected, 'PP', { locale })}`
    : placeholder

  const pick = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${triggerBase} ${invalid ? 'border-red-400/60' : 'border-white/10'} ${selected ? '' : 'text-white/45'} ${className}`}
      >
        <CalendarDays className="h-4 w-4 text-white/40" />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute right-0 z-50 mt-2 w-[284px] rounded-xl border border-white/10 bg-[#0a0a0a] p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView((v) => subMonths(v, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/[0.06]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold capitalize text-white">
              {format(view, 'LLLL yyyy', { locale })}
            </span>
            <button
              type="button"
              onClick={() => setView((v) => addMonths(v, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/[0.06]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {weekdayLabels.map((w, i) => (
              <div key={i} className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-white/35">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {weeks.flat().map((day, i) => {
              const inMonth = isSameMonth(day, view)
              const isSel = selected && isSameDay(day, selected)
              const disabled = minDate ? isBefore(startOfDay(day), startOfDay(minDate)) : false
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(day)}
                  className={[
                    'grid h-9 place-items-center rounded-lg text-sm transition-colors',
                    isSel
                      ? 'bg-brand-600 font-semibold text-white'
                      : disabled
                      ? 'cursor-not-allowed text-white/20'
                      : inMonth
                      ? 'text-white hover:bg-white/[0.08]'
                      : 'text-white/30 hover:bg-white/[0.06]',
                    !isSel && isToday(day) ? 'ring-1 ring-inset ring-brand-400/50' : '',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TimePicker
// ---------------------------------------------------------------------------

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return out
})()

function timeLabel(value: string, locale: Locale): string {
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return value
  return format(new Date(2000, 0, 1, h, m), 'p', { locale })
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  className = '',
}: {
  value: string // 'HH:mm'
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const locale = useDateLocale()
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]') as HTMLElement | null
      if (active) active.scrollIntoView({ block: 'center' })
    }
  }, [open])

  const label = value ? timeLabel(value, locale) : placeholder

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${triggerBase} border-white/10 ${value ? '' : 'text-white/45'} ${className}`}
      >
        <Clock className="h-4 w-4 text-white/40" />
        {label}
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute right-0 z-50 mt-2 max-h-64 w-40 overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a0a] p-1 shadow-2xl"
        >
          {TIME_OPTIONS.map((opt) => {
            const isSel = opt === value
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSel}
                data-active={isSel}
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isSel ? 'bg-brand-600 font-semibold text-white' : 'text-white/80 hover:bg-white/[0.08]'
                }`}
              >
                {timeLabel(opt, locale)}
                {isSel && <Check className="h-4 w-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
