import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPayoutHistory } from '@/lib/firestore/payout'

export const dynamic = 'force-dynamic'

/**
 * Return the current organizer's recent payouts for the mobile Payout Settings
 * history view. Read-only.
 */
export async function GET() {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payouts = await getPayoutHistory(user.id, 50)
    return NextResponse.json({ payouts })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load payout history' }, { status: 500 })
  }
}
