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
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <h3 className="font-display text-lg text-gray-900 leading-tight">{title}</h3>
              <p className="text-sm text-gray-500">{count} total</p>
            </div>
          </div>
          <Link
            href={viewAllHref}
            className="text-brand-600 hover:text-brand-700 font-medium text-sm flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Queue Items */}
      <div className="divide-y divide-gray-100">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-sm text-gray-500 truncate">{item.subtitle}</p>
                  )}
                  {item.timestamp && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
                {item.badge && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
