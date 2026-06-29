import { NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    // Fetch a few Canada events directly from Firestore to verify currency
    const snapshot = await adminDb
      .collection('events')
      .where('country', '==', 'CA')
      .limit(10)
      .get()

    const events = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        country: data.country,
        currency: data.currency,
        ticket_price: data.ticket_price,
      }
    })

    return adminOk({
      count: events.length,
      events,
      message: 'Direct Firestore query bypassing all caches',
    })
  } catch (err: any) {
    console.error('verify-canada-currency error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}
