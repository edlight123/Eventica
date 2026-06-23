import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getPlatformCounts, get7DayMetrics } from '@/lib/firestore/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RealtimeData {
  metrics: {
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
  activities: Array<{
    id: string
    type: string
    title: string
    description: string
    timestamp: string
    actor?: any
    metadata?: any
  }>
  systemStatus: {
    status: 'online' | 'degraded' | 'offline'
    services: {
      payments: boolean
      analytics: boolean
      notifications: boolean
    }
    timestamp: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get platform counts and metrics
    const [platformCounts, metrics7d] = await Promise.all([
      getPlatformCounts(),
      get7DayMetrics()
    ])

    // Get recent activities (last 10)
    const activitiesSnapshot = await adminDb
      .collection('admin_activities')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get()

    const activities = activitiesSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        type: data.type || 'system',
        title: data.title || 'Activity',
        description: data.description || '',
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        actor: data.actor ? {
          name: data.actor.name || data.actor.email?.split('@')[0] || 'System',
          email: data.actor.email,
          role: data.actor.role || 'admin'
        } : undefined,
        metadata: data.metadata || {}
      }
    })

    // Get system status (simple check - in production, this would check actual service health)
    const systemStatus = {
      status: 'online' as const,
      services: {
        payments: true,
        analytics: true,
        notifications: true
      },
      timestamp: new Date().toISOString()
    }

    const realtimeData: RealtimeData = {
      metrics: {
        usersCount: platformCounts.usersCount || 0,
        eventsCount: platformCounts.eventsCount || 0,
        tickets7d: metrics7d.tickets7d || 0,
        gmv7d: metrics7d.gmv7d || 0,
        refunds7d: metrics7d.refunds7d || 0,
        refundsAmount7d: metrics7d.refundsAmount7d || 0,
        pendingCount: platformCounts.pendingVerifications || 0,
        pendingBankCount: (platformCounts as any).pendingBankVerifications || 0,
        timestamp: new Date().toISOString()
      },
      activities,
      systemStatus
    }

    return NextResponse.json(realtimeData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Realtime API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch realtime data' },
      { status: 500 }
    )
  }
}

// POST endpoint for broadcasting events (called by other admin actions)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, description, metadata } = body

    // Store activity in Firestore
    await adminDb.collection('admin_activities').add({
      type: type || 'system',
      title: title || 'Activity',
      description: description || '',
      timestamp: new Date(),
      actor: {
        id: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        role: 'admin'
      },
      metadata: metadata || {}
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error broadcasting activity:', error)
    return NextResponse.json(
      { error: 'Failed to broadcast activity' },
      { status: 500 }
    )
  }
}
