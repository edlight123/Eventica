'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { QueueSummary } from '@/lib/admin/queue-keys'

export interface AdminMetricsUpdate {
  usersCount: number
  eventsCount: number
  tickets7d: number
  gmv7d: number
  refunds7d: number
  refundsAmount7d: number
  pendingCount: number
  pendingBankCount: number
  timestamp: string
}

export interface AdminActivity {
  id: string
  type: 'verification' | 'payment' | 'event' | 'security' | 'user_action' | 'system'
  title: string
  description: string
  timestamp: string
  actor?: {
    name: string
    email?: string
    role: string
  }
  metadata?: any
}

export interface SystemStatus {
  status: 'online' | 'degraded' | 'offline'
  services: {
    payments: boolean
    analytics: boolean
    notifications: boolean
  }
  timestamp: string
}

export interface RealtimeData {
  metrics: AdminMetricsUpdate
  activities: AdminActivity[]
  systemStatus: SystemStatus
}

export interface AdminRealtimeContextValue {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  data: RealtimeData | null
  metrics: AdminMetricsUpdate | null
  activities: AdminActivity[]
  systemStatus: SystemStatus | null
  /** Null until the first poll lands; a null VALUE within it means that queue's read failed. */
  queues: QueueSummary | null
  lastUpdate: Date | null
  refresh: () => Promise<void>
  addActivity: (activity: Omit<AdminActivity, 'id' | 'timestamp'>) => Promise<void>
}

const AdminRealtimeContext = createContext<AdminRealtimeContextValue | null>(null)

interface AdminRealtimeProviderProps {
  children: React.ReactNode
  enabled?: boolean
  pollingInterval?: number
}

export function AdminRealtimeProvider({ 
  children, 
  enabled = true,
  pollingInterval = 10000 // 10 seconds default
}: AdminRealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<AdminRealtimeContextValue['connectionStatus']>('disconnected')
  const [data, setData] = useState<RealtimeData | null>(null)
  const [queues, setQueues] = useState<QueueSummary | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout>()
  const isFetchingRef = useRef(false)
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 3

  const fetchRealtimeData = useCallback(async () => {
    if (isFetchingRef.current) return
    
    isFetchingRef.current = true
    
    try {
      // Both endpoints ride the same poll. The queue summary is fetched with its
      // own catch because it must never mark the connection down — the metrics
      // endpoint is the connection's health signal, not this one.
      const [response, queuesResponse] = await Promise.all([
        fetch('/api/admin/realtime', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        }),
        fetch('/api/admin/queues/summary', { cache: 'no-store' }).catch(() => null),
      ])

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (queuesResponse && queuesResponse.ok) {
        try {
          const payload = await queuesResponse.json()
          setQueues(payload?.queues ?? null)
        } catch {
          // Malformed body: keep the last good summary rather than blanking the rail.
        }
      }

      const realtimeData: RealtimeData = await response.json()

      setData(realtimeData)
      setLastUpdate(new Date())
      setIsConnected(true)
      setConnectionStatus('connected')
      retryCountRef.current = 0
    } catch (error) {
      console.error('Error fetching realtime data:', error)
      
      retryCountRef.current++
      if (retryCountRef.current >= MAX_RETRIES) {
        setIsConnected(false)
        setConnectionStatus('error')
      }
    } finally {
      isFetchingRef.current = false
    }
  }, [])

  const addActivity = useCallback(async (activity: Omit<AdminActivity, 'id' | 'timestamp'>) => {
    try {
      const response = await fetch('/api/admin/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: activity.type,
          title: activity.title,
          description: activity.description,
          metadata: activity.metadata
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add activity')
      }

      // Refresh data to get the new activity
      await fetchRealtimeData()
    } catch (error) {
      console.error('Error adding activity:', error)
    }
  }, [fetchRealtimeData])

  const refresh = useCallback(async () => {
    await fetchRealtimeData()
  }, [fetchRealtimeData])

  // Initial fetch and polling setup
  useEffect(() => {
    if (!enabled) return

    setConnectionStatus('connecting')
    fetchRealtimeData()

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      fetchRealtimeData()
    }, pollingInterval)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [enabled, pollingInterval, fetchRealtimeData])

  // Visibility change handling - pause/resume polling when tab is hidden/visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
        }
      } else {
        fetchRealtimeData()
        pollingIntervalRef.current = setInterval(() => {
          fetchRealtimeData()
        }, pollingInterval)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pollingInterval, fetchRealtimeData])

  const value: AdminRealtimeContextValue = {
    isConnected,
    connectionStatus,
    data,
    metrics: data?.metrics || null,
    activities: data?.activities || [],
    systemStatus: data?.systemStatus || null,
    queues,
    lastUpdate,
    refresh,
    addActivity
  }

  return (
    <AdminRealtimeContext.Provider value={value}>
      {children}
    </AdminRealtimeContext.Provider>
  )
}

export function useAdminRealtime() {
  const context = useContext(AdminRealtimeContext)
  if (!context) {
    throw new Error('useAdminRealtime must be used within AdminRealtimeProvider')
  }
  return context
}

// Specialized hooks for specific data
export function useAdminMetrics() {
  const { metrics, isConnected } = useAdminRealtime()
  return { metrics, isConnected }
}

export function useAdminActivities() {
  const { activities, isConnected, addActivity } = useAdminRealtime()
  return { activities, isConnected, addActivity }
}

export function useSystemStatus() {
  const { systemStatus, isConnected, lastUpdate } = useAdminRealtime()
  return { systemStatus, isConnected, lastUpdate }
}

/**
 * Single source of truth for the admin "needs attention" figure.
 * Definition: pending verifications + pending bank verifications.
 * Consumed by the top-nav Verifications badge, the command-bar bell badge,
 * the "Pending Tasks" KPI, and the dashboard quick-actions urgent count so
 * they never disagree. Backed by the provider's existing 10s poll — no extra
 * fetch loop.
 */
export function useAdminPendingCount() {
  const { metrics, isConnected } = useAdminRealtime()
  const pendingCount = metrics?.pendingCount ?? 0
  const pendingBankCount = metrics?.pendingBankCount ?? 0
  return { pendingCount, pendingBankCount, total: pendingCount + pendingBankCount, isConnected }
}

/**
 * Per-queue counts and oldest-waiting ages for the sidebar and the Needs You
 * landing. Rides the same 10s poll — no extra fetch loop.
 *
 * Three states, all distinct and all meaningful to render differently:
 *   queues === null            → the first poll has not landed yet
 *   queues[key] === null       → that queue's read FAILED; show it as unknown
 *   queues[key].count === 0    → that queue is genuinely CLEAR
 */
export function useAdminQueues() {
  const { queues, isConnected } = useAdminRealtime()
  return { queues, isConnected }
}
