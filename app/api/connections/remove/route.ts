import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { removeConnection } from '@/lib/firestore/connections'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await request.json()
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
    }

    const result = await removeConnection(user.id, targetUserId)
    if (!result.ok) {
      return NextResponse.json({ error: 'Failed to remove connection' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, status: 'none' })
  } catch (error: any) {
    console.error('Error removing connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
