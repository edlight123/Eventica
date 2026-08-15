import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getQueueSummary } from '@/lib/admin/queue-summary'
import type { QueueSummary } from '@/lib/admin/queue-keys'

export const dynamic = 'force-dynamic'

/**
 * Eight queues, each costing an aggregation plus a small read. The admin
 * provider polls every 10s, so this is cached for slightly less than one poll
 * interval — concurrent admins then share one set of reads instead of each
 * paying for their own.
 */
const CACHE_MS = 9_000

let cached: { at: number; value: QueueSummary } | null = null
let inFlight: Promise<QueueSummary> | null = null

async function readSummary(): Promise<QueueSummary> {
  const now = Date.now()
  if (cached && now - cached.at < CACHE_MS) return cached.value
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const value = await getQueueSummary()
      cached = { at: Date.now(), value }
      return value
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

export async function GET() {
  const { user, error } = await requireAdmin()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const queues = await readSummary()
  return NextResponse.json(
    { queues, timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
