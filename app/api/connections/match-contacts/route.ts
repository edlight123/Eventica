import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { matchContacts } from '@/lib/firestore/connections'

export const runtime = 'nodejs'

const MAX_PHONES = 2000

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const phones = body?.phones

    if (!Array.isArray(phones)) {
      return NextResponse.json({ error: 'phones must be an array' }, { status: 400 })
    }

    const cleaned = phones
      .filter((p) => typeof p === 'string')
      .slice(0, MAX_PHONES)

    const matches = await matchContacts(user.id, cleaned)
    return NextResponse.json({ matches })
  } catch (error: any) {
    console.error('Error matching contacts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
