'use client'

import { useState, useEffect, useCallback } from 'react'

interface SuspiciousActivity {
  id: string
  user_id: string | null
  activity_type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  ip_address: string | null
  detected_at: string
  reviewed: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  action_taken: string | null
  users?: {
    name: string
    email: string
  }
}

const SEVERITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  rapid_purchases: '🚀 Rapid Purchases',
  duplicate_tickets: '🎫 Duplicate Tickets',
  unusual_location: '🌍 Unusual Location',
  bot_behavior: '🤖 Bot Behavior',
  chargeback: '💳 Chargeback',
  multiple_accounts: '👥 Multiple Accounts',
}

export default function SecurityDashboardClient() {
  const [activities, setActivities] = useState<SuspiciousActivity[]>([])
  const [unreviewedCount, setUnreviewedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rebuildStatus, setRebuildStatus] = useState<
    | null
    | {
        running: boolean
        step: 'users' | 'events' | 'tickets' | 'done'
        processed: { users: number; events: number; tickets: number }
        error?: string
      }
  >(null)
  const [filter, setFilter] = useState<{
    reviewed: string
    severity: string
    activityType: string
  }>({
    reviewed: 'false',
    severity: '',
    activityType: '',
  })
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [actionText, setActionText] = useState('')

  const rebuildSearchIndex = async () => {
    if (!confirm('Rebuild admin search index now? This may take a few minutes.')) return

    setRebuildStatus({
      running: true,
      step: 'users',
      processed: { users: 0, events: 0, tickets: 0 },
    })

    const runStep = async (type: 'users' | 'events' | 'tickets') => {
      let cursor: string | null = null
      let total = 0

      while (true) {
        setRebuildStatus((prev) =>
          prev
            ? {
                ...prev,
                running: true,
                step: type,
              }
            : prev
        )

        const res: Response = await fetch('/api/admin/search/rebuild', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, cursor, limit: 200 }),
        })

        const data: any = await res.json().catch(() => ({}))
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || data?.details || 'Rebuild failed')
        }

        total += Number(data.processed || 0)
        cursor = data.nextCursor || null

        setRebuildStatus((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            running: true,
            step: type,
            processed: {
              ...prev.processed,
              [type]: total,
            },
          }
        })

        if (data.done || !cursor) break
      }
    }

    try {
      await runStep('users')
      await runStep('events')
      await runStep('tickets')

      setRebuildStatus((prev) =>
        prev
          ? {
              ...prev,
              running: false,
              step: 'done',
            }
          : {
              running: false,
              step: 'done',
              processed: { users: 0, events: 0, tickets: 0 },
            }
      )
    } catch (e) {
      setRebuildStatus((prev) =>
        prev
          ? {
              ...prev,
              running: false,
              error: e instanceof Error ? e.message : 'Rebuild failed',
            }
          : {
              running: false,
              step: 'users',
              processed: { users: 0, events: 0, tickets: 0 },
              error: e instanceof Error ? e.message : 'Rebuild failed',
            }
      )
    }
  }

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.reviewed) params.append('reviewed', filter.reviewed)
      if (filter.severity) params.append('severity', filter.severity)
      if (filter.activityType) params.append('activityType', filter.activityType)

      const response = await fetch(`/api/admin/suspicious-activities?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch activities')
      }

      const data = await response.json()
      setActivities(data.activities || [])
      setUnreviewedCount(data.unreviewedCount || 0)
    } catch (error) {
      console.error('Error fetching activities:', error)
      alert('Failed to load suspicious activities')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const handleReview = async (activityId: string, action: string) => {
    try {
      const response = await fetch('/api/admin/suspicious-activities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, actionTaken: action }),
      })

      if (!response.ok) {
        throw new Error('Failed to update activity')
      }

      // Refresh list
      fetchActivities()
      setReviewingId(null)
      setActionText('')
    } catch (error) {
      console.error('Error reviewing activity:', error)
      alert('Failed to mark as reviewed')
    }
  }

  const getSeverityBadge = (severity: string) => {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]
        }`}
      >
        {severity.toUpperCase()}
      </span>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-mobile-nav">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">Security Dashboard</h1>
          <p className="mt-1 sm:mt-2 text-[13px] sm:text-base text-gray-600">
            Monitor and review suspicious activities
          </p>
          {unreviewedCount > 0 && (
            <div className="mt-3 sm:mt-4 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <p className="text-[13px] sm:text-base text-red-800 font-medium">
                ⚠️ {unreviewedCount} unreviewed suspicious {unreviewedCount === 1 ? 'activity' : 'activities'}
              </p>
            </div>
          )}
        </div>

        {/* Admin Tools */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Admin tools</h2>
          <p className="text-[13px] sm:text-sm text-gray-600 mb-4">
            Rebuild the admin search index so search is fully populated immediately.
          </p>

          <button
            onClick={rebuildSearchIndex}
            disabled={Boolean(rebuildStatus?.running)}
            className="bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-lg text-[15px] sm:text-base font-semibold disabled:opacity-50 min-h-[44px]"
          >
            {rebuildStatus?.running ? 'Rebuilding…' : 'Rebuild search index'}
          </button>

          {rebuildStatus && (
            <div className="mt-4 text-sm text-gray-700">
              <div>Users indexed: {rebuildStatus.processed.users}</div>
              <div>Events indexed: {rebuildStatus.processed.events}</div>
              <div>Tickets indexed: {rebuildStatus.processed.tickets}</div>
              {rebuildStatus.step !== 'done' && (
                <div className="text-gray-500 mt-1">Current step: {rebuildStatus.step}</div>
              )}
              {rebuildStatus.step === 'done' && (
                <div className="text-green-700 font-semibold mt-1">Rebuild complete</div>
              )}
              {rebuildStatus.error && (
                <div className="text-red-700 font-semibold mt-1">{rebuildStatus.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Review Status
              </label>
              <select
                value={filter.reviewed}
                onChange={(e) => setFilter({ ...filter, reviewed: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-[15px] sm:text-base min-h-[44px]"
              >
                <option value="">All</option>
                <option value="false">Unreviewed</option>
                <option value="true">Reviewed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Severity
              </label>
              <select
                value={filter.severity}
                onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-[15px] sm:text-base min-h-[44px]"
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Activity Type
              </label>
              <select
                value={filter.activityType}
                onChange={(e) => setFilter({ ...filter, activityType: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-[15px] sm:text-base min-h-[44px]"
              >
                <option value="">All</option>
                <option value="rapid_purchases">Rapid Purchases</option>
                <option value="duplicate_tickets">Duplicate Tickets</option>
                <option value="unusual_location">Unusual Location</option>
                <option value="bot_behavior">Bot Behavior</option>
                <option value="chargeback">Chargeback</option>
                <option value="multiple_accounts">Multiple Accounts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activities List */}
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-[13px] sm:text-base text-gray-600">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <p className="text-[13px] sm:text-base text-gray-600">No suspicious activities found</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">
                        {ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}
                      </span>
                      {getSeverityBadge(activity.severity)}
                      {activity.reviewed && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Reviewed
                        </span>
                      )}
                    </div>

                    <p className="text-gray-900 font-medium mb-2">
                      {activity.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {activity.users && (
                        <span>
                          👤 {activity.users.name} ({activity.users.email})
                        </span>
                      )}
                      {activity.ip_address && (
                        <span>🌐 {activity.ip_address}</span>
                      )}
                      <span>
                        🕒 {new Date(activity.detected_at).toLocaleString()}
                      </span>
                    </div>

                    {activity.reviewed && activity.action_taken && (
                      <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          <strong>Action Taken:</strong> {activity.action_taken}
                        </p>
                        {activity.reviewed_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Reviewed on {new Date(activity.reviewed_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!activity.reviewed && (
                    <div>
                      {reviewingId === activity.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Action taken (optional)"
                            value={actionText}
                            onChange={(e) => setActionText(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(activity.id, actionText)}
                              className="px-3 py-1 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setReviewingId(null)
                                setActionText('')
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewingId(activity.id)}
                          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
                        >
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
