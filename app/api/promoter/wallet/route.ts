// The promoter's wallet: available vs pending commission (pending = still held
// by the event's release ladder, exactly like the organizer's own funds), their
// MonCash number, and recent withdrawals.

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getPromoterWalletView } from '@/lib/promoter-wallet'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const view = await getPromoterWalletView(user.id)

    const withdrawalsSnap = await adminDb
      .collection('withdrawal_requests')
      .where('promoter_uid', '==', user.id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    const withdrawals = withdrawalsSnap.docs.map((d: any) => {
      const w = d.data()
      return {
        id: d.id,
        status: w.status || 'pending',
        grossCents: Number(w.amount) || 0,
        feeCents: Number(w.feeCents) || 0,
        payoutHtgCents: Number(w.payoutAmountHtgCents ?? w.payoutAmountCents) || 0,
        instant: Boolean(w.prefundingUsed),
        createdAt: w.createdAt?.toDate ? w.createdAt.toDate().toISOString() : w.createdAt || null,
      }
    })

    return NextResponse.json({ wallet: view, withdrawals })
  } catch (err: any) {
    console.error('[promoter-wallet] view failed', err)
    return NextResponse.json({ error: 'Failed to load your wallet' }, { status: 500 })
  }
}
