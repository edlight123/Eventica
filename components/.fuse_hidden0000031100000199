import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  actionIcon?: LucideIcon
  /** Visual tone. 'light' (default) for dashboards; 'dark' for public dark surfaces. */
  tone?: 'light' | 'dark'
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionIcon: ActionIcon,
  tone = 'light',
}: EmptyStateProps) {
  const dark = tone === 'dark'
  return (
    <div className={`rounded-2xl border-2 border-dashed p-12 text-center hover:border-brand-400 transition-colors duration-300 ${dark ? 'bg-white/5 border-white/15' : 'bg-white border-gray-300'}`}>
      {/* Icon with Premium Styling */}
      <div className="relative inline-block mb-6">
        <div className="absolute inset-0 rounded-full blur-xl opacity-50"></div>
        <div className={`relative rounded-full p-6 ${dark ? 'bg-white/5' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
          <Icon className={`w-16 h-16 ${dark ? 'text-white/40' : 'text-gray-400'}`} strokeWidth={1.5} />
        </div>
      </div>

      {/* Title */}
      <h3 className={`text-2xl font-bold mb-3 ${dark ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`mb-6 max-w-md mx-auto leading-relaxed ${dark ? 'text-white/55' : 'text-gray-600'}`}>
        {description}
      </p>

      {/* Action Button */}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-xl font-bold hover:shadow-glow transition-all duration-300 hover:scale-105"
        >
          {ActionIcon && <ActionIcon className="w-5 h-5" />}
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
