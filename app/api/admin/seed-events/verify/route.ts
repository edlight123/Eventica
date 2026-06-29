import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import adminApp from '@/lib/firebase/admin'
import { requireDevTools } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const organizersSnap = await adminDb
      .collection('users')
      .where('email', '==', 'info@edlight.org')
      .limit(1)
      .get()

    if (organizersSnap.empty) {
      return adminError('Organizer account info@edlight.org not found', 404)
    }

    const organizerId = organizersSnap.docs[0].id

    // Check events that Discover/Home will actually query.
    // Primary: is_published == true
    const publishedSnap = await adminDb
      .collection('events')
      .where('organizer_id', '==', organizerId)
      .where('is_published', '==', true)
      .orderBy('start_datetime', 'asc')
      .limit(10)
      .get()

    // Fallback: legacy status == 'published'
    const statusSnap = publishedSnap.empty
      ? await adminDb
          .collection('events')
          .where('organizer_id', '==', organizerId)
          .where('status', '==', 'published')
          .orderBy('start_datetime', 'asc')
          .limit(10)
          .get()
      : null

    const docs = (publishedSnap.empty ? statusSnap?.docs ?? [] : publishedSnap.docs).map((d: any) => {
      const data = d.data() || {}
      const start = data?.start_datetime?.toDate?.()?.toISOString() || data?.start_datetime || null
      return {
        id: d.id,
        title: data?.title || null,
        is_published: data?.is_published ?? null,
        status: data?.status ?? null,
        start_datetime: start,
        country: data?.country ?? null,
        city: data?.city ?? null,
      }
    })

    return adminOk({
      demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
      clientProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
      serverProjectId: (adminApp as any)?.options?.projectId || null,
      organizerId,
      counts: {
        publishedQueryCount: publishedSnap.size,
        statusQueryCount: statusSnap?.size ?? 0,
      },
      sample: docs,
    })
  } catch (error: any) {
    console.error('Error verifying seeded events:', error)
    return adminError('Failed to verify seeded events', 500, error?.message || 'Unknown error')
  }
}
