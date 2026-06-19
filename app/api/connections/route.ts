import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getConnectionsOverview } from '@/lib/firestore/connections'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const overview = await getConnectionsOverview(user.id)
    return NextResponse.json(overview)
  } catch (error: any) {
    console.error('Error fetching connections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
