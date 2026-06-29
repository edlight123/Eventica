'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { FilterChip } from '@/components/FilterChip'
import { CATEGORIES } from '@/lib/filters/config'
import { Music, Trophy, Palette, Briefcase, PartyPopper, Sparkles, Ticket, Drama } from 'lucide-react'

interface CategoryChipsProps {
  selectedCategories: string[]
  /** When true, render only the chip row (no horizontal-scroll wrapper) for embedding in a shared strip. */
  bare?: boolean
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Concert': <Music className="w-3.5 h-3.5" />,
  'Party': <PartyPopper className="w-3.5 h-3.5" />,
  'Festival': <Sparkles className="w-3.5 h-3.5" />,
  'Conference': <Briefcase className="w-3.5 h-3.5" />,
  'Workshop': <Palette className="w-3.5 h-3.5" />,
  'Sports': <Trophy className="w-3.5 h-3.5" />,
  'Theater': <Drama className="w-3.5 h-3.5" />,
  'Other': <Ticket className="w-3.5 h-3.5" />,
}

export function CategoryChips({ selectedCategories, bare = false }: CategoryChipsProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryToggle = (category: string) => {
    const params = new URLSearchParams(searchParams)
    const current = params.getAll('category')
    
    let updated: string[]
    if (current.includes(category)) {
      updated = current.filter(c => c !== category)
    } else {
      updated = [...current, category]
    }
    
    params.delete('category')
    updated.forEach(cat => params.append('category', cat))
    
    router.push(`?${params.toString()}`)
  }

  return (
    <div className={bare ? 'flex gap-2 min-w-max' : 'scrollbar-hide overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0'}>
      <div className="flex gap-2 min-w-max">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => handleCategoryToggle(category)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all whitespace-nowrap
              ${selectedCategories.includes(category)
                ? 'border-brand-400 text-brand-300 shadow-sm'
                : 'border-transparent text-white/75 hover:bg-white/15'
              }`}
          >
            {CATEGORY_ICONS[category]}
            {t(`categories.${category}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
