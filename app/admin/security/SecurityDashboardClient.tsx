'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  ShieldCheck,
  ListChecks,
  Database,
  Filter,
  User as UserIcon,
  Globe,
  Clock,
} from 'lucide-react'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

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
  low: 'text-white/60',
  medium: 'text-amber-300',
  high: 'text-amber-300',
  critical: 'text-red-300',
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
        className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wide ${
          SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]
        }`}
      >
        {severity.toUpperCase()}
      </span>
    )
  }

  const criticalCount = activities.filter((a) => a.severity === 'critical').length

  return (
    <div className="mt-5 space-y-6">
      <EditorialHeader
        eyebrow="Platform"
        title="Security Dashboard"
        subtitle="Monitor and review suspicious activities"
        tone="dark"
      />

      {/* KPI strip */}
      <div className="grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10">
        <div className="p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
            <AlertTriangle className="h-3.5 w-3.5 text-white/30" /> Unreviewed
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">{unreviewedCount}</div>
        </div>
        <div className="p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
            <ShieldCheck className="h-3.5 w-3.5 text-white/30" /> Critical
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">{criticalCount}</div>
        </div>
        <div className="p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
            <ListChecks className="h-3.5 w-3.5 text-white/30" /> In View
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">{activities.length}</div>
        </div>
      </div>

      {/* Admin Tools */}
      <div className="rounded-lg border border-white/10 p-4">
        <div className="mb-1 flex items-center gap-2">
          <Database className="h-4 w-4 text-white/40" />
          <h2 className="text-base font-semibold text-white">Admin tools</h2>
        </div>
        <p className="mb-4 text-sm text-white/50">
          Rebuild the admin search index so search is fully populated immediately.
        </p>

        <button
          onClick={rebuildSearchIndex}
          disabled={Boolean(rebuildStatus?.running)}
          className="min-h-[44px] rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.04] disabled:opacity-50"
        >
          {rebuildStatus?.running ? 'Rebuilding…' : 'Rebuild search index'}
        </button>

        {rebuildStatus && (
          <div className="mt-4 space-y-1 text-sm text-white/70">
            <div>Users indexed: {rebuildStatus.processed.users}</div>
            <div>Events indexed: {rebuildStatus.processed.events}</div>
            <div>Tickets indexed: {rebuildStatus.processed.tickets}</div>
            {rebuildStatus.step !== 'done' && (
              <div className="text-white/50">Current step: {rebuildStatus.step}</div>
            )}
            {rebuildStatus.step === 'done' && (
              <div className="font-semibold text-emerald-300">Rebuild complete</div>
            )}
            {rebuildStatus.error && (
              <div className="font-semibold text-red-300">{rebuildStatus.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-white/10 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/40" />
          <h2 className="text-base font-semibold text-white">Filters</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/40">
              Review Status
            </label>
            <select
              value={filter.reviewed}
              onChange={(e) => setFilter({ ...filter, reviewed: e.target.value })}
              className="min-h-[44px] w-full rounded-lg border border-white/10 bg-transparent px-3 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">All</option>
              <option value="false">Unreviewed</option>
              <option value="true">Reviewed</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/40">
              Severity
            </label>
            <select
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              className="min-h-[44px] w-full rounded-lg border border-white/10 bg-transparent px-3 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-white/40">
              Activity Type
            </label>
            <select
              value={filter.activityType}
              onChange={(e) => setFilter({ ...filter, activityType: e.target.value })}
              className="min-h-[44px] w-full rounded-lg border border-white/10 bg-transparent px-3 text-sm text-white focus:border-white/20 focus:outline-none"
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
        <div className="py-12 text-center">
          <p className="text-sm text-white/50">Loading activities...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-12 text-center">
          <p className="text-sm text-white/50">No suspicious activities found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-lg border border-white/10 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-sm font-medium text-white">
                      {ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}
                    </span>
                    {getSeverityBadge(activity.severity)}
                    {activity.reviewed && (
                      <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                        Reviewed
                      </span>
                    )}
                  </div>

                  <p className="mb-2 font-medium text-white">
                    {activity.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/50">
                    {activity.users && (
                      <span className="inline-flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-white/40" />
                        {activity.users.name} ({activity.users.email})
                      </span>
                    )}
                    {activity.ip_address && (
                      <span className="inline-flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-white/40" />
                        {activity.ip_address}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-white/40" />
                      {new Date(activity.detected_at).toLocaleString()}
                    </span>
                  </div>

                  {activity.reviewed && activity.action_taken && (
                    <div className="mt-3 rounded-lg border border-white/10 p-3">
                      <p className="text-sm text-white/70">
                        <strong className="font-semibold text-white">Action Taken:</strong> {activity.action_taken}
                      </p>
                      {activity.reviewed_at && (
                        <p className="mt-1 text-xs text-white/40">
                          Reviewed on {new Date(activity.reviewed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {!activity.reviewed && (
                  <div className="shrink-0">
                    {reviewingId === activity.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Action taken (optional)"
                          value={actionText}
                          onChange={(e) => setActionText(e.target.value)}
                          className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(activity.id, actionText)}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              setReviewingId(null)
                              setActionText('')
                            }}
                            className="rounded-lg border border-white/10 bg-transparent px-3 py-1.5 text-sm text-white/70 hover:bg-white/[0.04]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingId(activity.id)}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
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
  )
}
