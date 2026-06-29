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
      <div className="rounded-xl  p-8 text-center">
        <div className="w-12 h-12 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-3">
          <Clock className="w-6 h-6 text-white/50" />
        </div>
        <h3 className="font-bold text-white mb-1">No Recent Activity</h3>
        <p className="text-sm text-white/50">
          Activity logs will appear here once admin actions are tracked
        </p>
        <p className="text-xs text-white/50 mt-2">
          Requires <code className="bg-[#0a0a0a] px-1 rounded">admin_audit_log</code> collection
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl  overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <h3 className="font-bold text-white">Recent Activity</h3>
        <p className="text-sm text-white/50">Latest admin actions</p>
      </div>

      <div className="p-5">
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs">
                  {activity.icon || '👤'}
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-[#0a0a0a]" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">{activity.action}</p>
                <p className="text-xs text-white/50">by {activity.user}</p>
                <p className="text-xs text-white/50 mt-1">
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
