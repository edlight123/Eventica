import { NextRequest, NextResponse } from 'next/server'
import { getMessaging } from 'firebase-admin/messaging'
import { getCurrentUser } from '@/lib/auth'
import app from '@/lib/firebase/admin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tokens, title, body, data } = await request.json()

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ error: 'No tokens provided' }, { status: 400 })
    }

    if (!app) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 })
    }

    const messaging = getMessaging(app)

    // FCM data payloads require all values to be strings
    const stringData: Record<string, string> = {}
    if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        stringData[k] = String(v)
      }
    }

    const message = {
      notification: { title: String(title || ''), body: String(body || '') },
      ...(Object.keys(stringData).length ? { data: stringData } : {}),
      tokens: tokens as string[],
    }

    const response = await messaging.sendEachForMulticast(message)

    const successCount = response.responses.filter((r) => r.success).length
    const failureCount = response.responses.length - successCount

    return NextResponse.json({
      success: true,
      successCount,
      failureCount,
      total: tokens.length,
    })
  } catch (error: any) {
    console.error('Error sending push notification:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send push notification' },
      { status: 500 }
    )
  }
}
