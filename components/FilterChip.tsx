import React from 'react'

interface FilterChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  onRemove?: () => void
  className?: string
}

export function FilterChip({ label, active, onClick, onRemove, className = '' }: FilterChipProps) {
  if (onRemove) {
    // Removable chip (for applied filters)
    return (
      <button
        onClick={onRemove}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors
          bg-brand-600 text-white hover:bg-brand-700 ${className}`}
      >
        {label}
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )
  }

  // Selectable chip (for filter options)
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all
        ${active
          ? 'border-brand-400 text-brand-300'
          : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'
        } ${className}`}
    >
      {label}
    </button>
  )
}
