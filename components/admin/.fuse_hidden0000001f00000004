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
  iconBg,
  viewAllHref,
  emptyMessage = 'No items'
}: WorkQueueCardProps) {
  const badgeColors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    neutral: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 leading-tight truncate">{title}</h3>
              <p className="text-xs text-gray-500">{count} total</p>
            </div>
          </div>
          <Link
            href={viewAllHref}
            className="text-brand-600 hover:text-brand-700 font-medium text-xs flex items-center gap-1 flex-shrink-0"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Queue Items */}
      <div className="divide-y divide-gray-100">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-400 text-xs">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                    {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                    {item.subtitle && item.timestamp && <span className="text-gray-300">·</span>}
                    {item.timestamp && (
                      <span className="text-gray-400 whitespace-nowrap">
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
