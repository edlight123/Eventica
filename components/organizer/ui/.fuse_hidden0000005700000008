'use client'

import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Dark-canvas search input with clear button.
 * Sized for touch (min-height 44px) and usable as the first child of TableToolbar.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative flex min-w-0 items-center ${className}`}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 shrink-0 text-white/35" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-9 pr-8 text-sm text-white placeholder:text-white/30 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-2 grid h-5 w-5 place-items-center rounded text-white/40 hover:text-white/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
