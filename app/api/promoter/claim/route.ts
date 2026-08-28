// "Add this to my account": attach a promoter record to a signed-in user, so the
// /promoter portal aggregates everything they promote. Same two-credential shape
// as the guest ticket claim: a session (the account it moves TO) plus the signed
// stats token (proof the caller is that promoter). Idempotent for the same
// account; refused if a different account already claimed it.

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getPromoterByStatsKey, verifyPromoterToken } from '@/lib/promoters'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to add this to your account.' }, { status: 401 })
    }

    const { token } = await request.json().catch(() => ({ token: '' }))
    const statsKey = verifyPromoterToken(String(token || ''))
    const promoter = statsKey ? await getPromoterByStatsKey(statsKey) : null
    if (!promoter) {
      return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 })
    }

    if (promoter.claimed_by_uid && promoter.claimed_by_uid !== user.id) {
      return NextResponse.json(
        { error: 'This promoter page is already in another Tikèm account.' },
        { status: 409 }
      )
    }

    if (!promoter.claimed_by_uid) {
      await adminDb.collection('event_promoters').doc(promoter.id).update({
        claimed_by_uid: user.id,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[promoter-claim] failed', err)
    return NextResponse.json({ error: 'Could not add this to your account.' }, { status: 500 })
  }
}
