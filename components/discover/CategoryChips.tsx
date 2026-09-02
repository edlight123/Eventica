'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from '@/lib/filters/config'
import { Music, Trophy, Palette, Briefcase, PartyPopper, Sparkles, Ticket, Drama, UtensilsCrossed, Users, ChevronDown, Check, X } from 'lucide-react'

interface CategoryChipsProps {
  selectedCategories: string[]
  /** Kept for API compatibility with the strip; layout is identical either way. */
  bare?: boolean
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Concert': <Music className="h-4 w-4" />,
  'Party': <PartyPopper className="h-4 w-4" />,
  'Festival': <Sparkles className="h-4 w-4" />,
  'Conference': <Briefcase className="h-4 w-4" />,
  'Workshop': <Palette className="h-4 w-4" />,
  'Sports': <Trophy className="h-4 w-4" />,
  'Theater': <Drama className="h-4 w-4" />,
  'Food & Drink': <UtensilsCrossed className="h-4 w-4" />,
  'Family': <Users className="h-4 w-4" />,
  'Other': <Ticket className="h-4 w-4" />,
}

/**
 * Category quick-filter as a single compact dropdown (multi-select), replacing a
 * long row of chips. The menu is portaled to <body> so it is never clipped by
 * the horizontally-scrolling filter strip.
 */
export function CategoryChips({ selectedCategories }: CategoryChipsProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const selected = selectedCategories || []
  const count = selected.length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = (category: string) => {
    const params = new URLSearchParams(searchParams)
    const current = params.getAll('category')
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]
    params.delete('category')
    updated.forEach((cat) => params.append('category', cat))
    router.push(`?${params.toString()}`)
  }

  const clearAll = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('category')
    router.push(`?${params.toString()}`)
  }

  const label =
    count === 0
      ? t('filters.categories', { defaultValue: 'Category' })
      : count === 1
      ? t(`categories.${selected[0]}`, { defaultValue: selected[0] })
      : `${count} ${t('filters.categories', { defaultValue: 'categories' }).toLowerCase()}`

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all ${
          count > 0 ? 'border-brand-400 text-brand-300' : 'border-white/15 text-white/75 hover:bg-white/10'
        }`}
      >
        {label}
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={t('filters.categories', { defaultValue: 'Category' })}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="relative z-[101] w-full max-w-sm rounded-t-2xl border border-white/10 bg-[#0a0a0a] p-4 shadow-2xl sm:rounded-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">{t('filters.categories', { defaultValue: 'Category' })}</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((category) => {
                  const isSel = selected.includes(category)
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggle(category)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                        isSel ? 'border-brand-400 bg-brand-500/10 text-brand-200' : 'border-white/10 text-white/80 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="text-white/60">{CATEGORY_ICONS[category]}</span>
                      <span className="flex-1 truncate">{t(`categories.${category}`, { defaultValue: category })}</span>
                      {isSel && <Check className="h-4 w-4 shrink-0 text-brand-300" />}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex gap-2">
                {count > 0 && (
                  <button
                    onClick={clearAll}
                    className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.04]"
                  >
                    {t('filters.clear_all', { defaultValue: 'Clear all' })}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  {t('common.done', { defaultValue: 'Done' })}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
