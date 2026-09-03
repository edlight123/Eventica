'use client'

import React from 'react'

interface FilterChipProps {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
}

/**
 * Individual filter chip for the dark canvas.
 * `active` fills the chip with the brand teal; inactive is a ghost border.
 */
export function FilterChip({
  active = false,
  onClick,
  children,
  count,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      // The inactive state was `bg-white/[0.03]` — the page's own background —
      // with a stray leading space where a border class had been removed, so an
      // unselected chip was invisible and only the active one could be seen.
      // A real fill fixes that; h-11 on phones meets the touch floor.
      className={`inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:h-9 ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white'
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={`ml-0.5 rounded-full px-1.5 py-0.5 font-mono tabular-nums text-[10px] font-bold leading-none ${
            // Same fix as the chip: this badge's inactive fill was the page
            // background, so the count floated with no shape around it.
            active ? 'bg-white/20 text-white' : 'bg-white/15 text-white/70'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/**
 * Scrollable horizontal row of FilterChips.
 * Place below PageHeader or inside TableToolbar.
 */
export function FilterBar({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 ${className}`}
    >
      {children}
    </div>
  )
}
