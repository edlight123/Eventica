'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
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

/**
 * A real filled control, not a hairline around nothing.
 *
 * This was `border` + `bg-white/[0.03]` — a visible ring over a fill so faint
 * it read as empty, which is the exact pattern the owner rejected across the
 * composer's left column ("not every box needs to be a border w empty fill")
 * and then again for these two ("i dont like the light border and no fill. see
 * how you can make it more premium"). So the ring is gone and the fill does the
 * work: `bg-white/[0.07]` is the composer's own field surface, lifting to
 * `.11` on hover so the control still answers the cursor. Focus keeps a real
 * ring — that one is not decoration, it is how a keyboard user finds it.
 *
 * min-h-11 on phones: at 34px these were under the 44px touch floor, and they
 * are how every date and time in the app gets set. Desktop keeps the tighter
 * height via sm:.
 */
const triggerBase =
  'inline-flex min-h-11 items-center gap-2 rounded-lg bg-white/[0.07] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-brand-400/40 sm:min-h-0'

/**
 * Centered modal, portaled to <body> so it can never be clipped by an ancestor
 * with `overflow-hidden` / `transform` / `backdrop-blur`. Closes on backdrop
 * click and Escape; locks body scroll while open.
 */
function PickerModal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-sm',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className={`relative z-[101] w-full ${maxWidth} rounded-t-2xl border border-white/10 bg-[#111] p-4 shadow-2xl sm:rounded-2xl`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

// ---------------------------------------------------------------------------
// InlineCalendar — the month grid, controlled. Reused by DatePicker + others.
// ---------------------------------------------------------------------------

export function InlineCalendar({
  value,
  onChange,
  min,
}: {
  value: string // 'yyyy-MM-dd'
  onChange: (value: string) => void
  min?: string // 'yyyy-MM-dd'
}) {
  const locale = useDateLocale()
  const selected = parseDateValue(value)
  const minDate = parseDateValue(min)
  const [view, setView] = useState<Date>(() => selected || new Date())

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

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView((v) => subMonths(v, 1))}
          className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/[0.06]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold capitalize text-white">
          {format(view, 'LLLL yyyy', { locale })}
        </span>
        <button
          type="button"
          onClick={() => setView((v) => addMonths(v, 1))}
          className="grid h-9 w-9 place-items-center rounded-lg text-white/60 hover:bg-white/[0.06]"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
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
              onClick={() => onChange(format(day, 'yyyy-MM-dd'))}
              className={[
                'grid h-10 place-items-center rounded-lg text-sm transition-colors',
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
  )
}

// ---------------------------------------------------------------------------
// DatePicker
// ---------------------------------------------------------------------------

export function DatePicker({
  value,
  onChange,
  min,
  invalid = false,
  placeholder = 'Select date',
  title = 'Pick a date',
  className = '',
}: {
  value: string // 'yyyy-MM-dd'
  onChange: (value: string) => void
  min?: string // 'yyyy-MM-dd'
  invalid?: boolean
  placeholder?: string
  title?: string
  className?: string
}) {
  const locale = useDateLocale()
  const [open, setOpen] = useState(false)
  const selected = parseDateValue(value)

  const label = selected
    ? `${format(selected, 'EEE', { locale })}, ${format(selected, 'PP', { locale })}`
    : placeholder

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${triggerBase} ${invalid ? 'border-red-400/60' : 'border-white/10'} ${selected ? '' : 'text-white/45'} ${className}`}
      >
        <CalendarDays className="h-4 w-4 text-white/40" />
        {label}
      </button>

      <PickerModal open={open} onClose={() => setOpen(false)} title={title}>
        <InlineCalendar
          value={value}
          min={min}
          onChange={(d) => {
            onChange(d)
            setOpen(false)
          }}
        />
      </PickerModal>
    </>
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
  title = 'Pick a time',
  className = '',
}: {
  value: string // 'HH:mm'
  onChange: (value: string) => void
  placeholder?: string
  title?: string
  className?: string
}) {
  const locale = useDateLocale()
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]') as HTMLElement | null
      if (active) active.scrollIntoView({ block: 'center' })
    }
  }, [open])

  const label = value ? timeLabel(value, locale) : placeholder

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${triggerBase} border-white/10 ${value ? '' : 'text-white/45'} ${className}`}
      >
        <Clock className="h-4 w-4 text-white/40" />
        {label}
      </button>

      <PickerModal open={open} onClose={() => setOpen(false)} title={title} maxWidth="max-w-xs">
        <div ref={listRef} role="listbox" className="max-h-[60vh] overflow-y-auto rounded-lg">
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
                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors sm:min-h-0 ${
                  isSel ? 'bg-brand-600 font-semibold text-white' : 'text-white/80 hover:bg-white/[0.08]'
                }`}
              >
                {timeLabel(opt, locale)}
                {isSel && <Check className="h-4 w-4" />}
              </button>
            )
          })}
        </div>
      </PickerModal>
    </>
  )
}
