import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor: string
  /** @deprecated kept for call-site compatibility; chips are no longer rendered */
  iconBg?: string
  href?: string
  trend?: {
    value: string
    isPositive: boolean
  }
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  href,
  trend,
}: KpiCardProps) {
  const content = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <p className="truncate text-xs font-semibold uppercase tracking-wider text-white/50">
          {title}
        </p>
        <Icon className={`h-4 w-4 shrink-0 ${iconColor} opacity-70`} />
      </div>
      <p className="truncate text-2xl font-bold text-white sm:text-3xl">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && <p className="mt-1 truncate text-xs text-white/50">{subtitle}</p>}
      {trend && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
            trend.isPositive ? 'text-emerald-300' : 'text-red-300'
          }`}
        >
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-xl p-3 transition-colors hover:bg-white/[0.04] sm:p-4"
      >
        {content}
      </Link>
    )
  }

  return <div className="p-3 sm:p-4">{content}</div>
}
