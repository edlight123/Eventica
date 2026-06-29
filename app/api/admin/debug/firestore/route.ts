import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

function safeServiceAccountInfo() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) return { present: false as const }

  try {
    const parsed = JSON.parse(raw)
    return {
      present: true as const,
      projectId: typeof parsed?.project_id === 'string' ? parsed.project_id : null,
      clientEmailDomain:
        typeof parsed?.client_email === 'string' && parsed.client_email.includes('@')
          ? parsed.client_email.split('@')[1]
          : null,
    }
  } catch {
    return { present: true as const, projectId: null, clientEmailDomain: null }
  }
}

async function safeCount(ref: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference) {
  try {
    const snap = await (ref as any).count().get()
    return Number(snap?.data?.()?.count ?? 0)
  } catch (e: any) {
    return { error: String(e?.message || e) }
  }
}

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()

    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const adminProjectId =
      (adminDb as any)?.projectId ??
      (adminDb as any)?.app?.options?.projectId ??
      null

    const serviceAccount = safeServiceAccountInfo()

    const env = {
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || null,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || null,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || null,
      serviceAccount,
    }

    const eventsTotal = await safeCount(adminDb.collection('events'))
    const eventsPublished = await safeCount(
      adminDb.collection('events').where('is_published', '==', true)
    )
    const eventsDeletedBackups = await safeCount(adminDb.collection('events_deleted'))

    return adminOk({
      admin: { projectId: adminProjectId },
      env,
      counts: {
        eventsTotal,
        eventsPublished,
        eventsDeletedBackups,
      },
    })
  } catch (e: any) {
    console.error('debug/firestore failed:', e)
    return adminError('Internal server error', 500)
  }
}
