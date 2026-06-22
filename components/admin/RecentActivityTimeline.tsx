import { Clock } from 'lucide-react'

interface ActivityItem {
  id: string
  action: string
  user: string
  timestamp: string
  icon?: string
}

interface RecentActivityTimelineProps {
  activities: ActivityItem[]
}

export function RecentActivityTimeline({ activities }: RecentActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Clock className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="font-bold text-gray-900 mb-1">No Recent Activity</h3>
        <p className="text-sm text-gray-500">
          Activity logs will appear here once admin actions are tracked
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Requires <code className="bg-gray-100 px-1 rounded">admin_audit_log</code> collection
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-500">Latest admin actions</p>
      </div>

      <div className="p-5">
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-3">
              <div className="relative">
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-xs">
                  {activity.icon || '👤'}
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gray-200" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">by {activity.user}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
