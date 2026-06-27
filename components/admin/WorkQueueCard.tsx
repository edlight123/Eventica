import Link from 'next/link'
import { LucideIcon, ArrowRight } from 'lucide-react'

interface WorkQueueItem {
  id: string
  title: string
  subtitle?: string
  timestamp?: Date
  badge?: {
    label: string
    variant: 'success' | 'warning' | 'neutral' | 'error'
  }
}

interface WorkQueueCardProps {
  title: string
  count: number
  items: WorkQueueItem[]
  icon: LucideIcon
  iconColor: string
  iconBg: string
  viewAllHref: string
  emptyMessage?: string
}

export function WorkQueueCard({
  title,
  count,
  items,
  icon: Icon,
  iconColor,
  viewAllHref,
  emptyMessage = 'No items'
}: WorkQueueCardProps) {
  const badgeColors = {
    success: 'bg-emerald-500/15 text-emerald-300',
    warning: 'bg-amber-500/15 text-amber-300',
    neutral: 'bg-[#1c1c1c] text-white/90',
    error: 'bg-red-500/15 text-red-300'
  }

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon className={`w-4 h-4 shrink-0 ${iconColor} opacity-80`} />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-white leading-tight truncate">{title}</h3>
              <p className="text-xs text-white/50">{count} total</p>
            </div>
          </div>
          <Link
            href={viewAllHref}
            className="text-brand-300 hover:text-brand-300 font-medium text-xs flex items-center gap-1 flex-shrink-0"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Queue Items */}
      <div className="divide-y divide-white/10">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-white/40 text-xs">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="px-4 py-2.5 hover:bg-[#0a0a0a] transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-white/50 truncate">
                    {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                    {item.subtitle && item.timestamp && <span className="text-white/50">·</span>}
                    {item.timestamp && (
                      <span className="text-white/40 whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${
                    badgeColors[item.badge.variant]
                  }`}>
                    {item.badge.label}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
