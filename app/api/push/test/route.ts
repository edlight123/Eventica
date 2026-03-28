import { NextResponse } from 'next/server'
// @ts-expect-error no types
import webpush from 'web-push'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { createHash } from 'crypto'

function encodeEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex')
}

export const runtime = 'nodejs'

async function runTestSend() {
  // Fetch all stored subscriptions
  const snap = await adminDb.collection('pushSubscriptions').get()
  const subs: any[] = snap.docs
    .map((d: any) => ({ endpoint: d.data().endpoint, keys: d.data().keys }))
    .filter((s: any) => s.endpoint && s.keys && s.keys.p256dh && s.keys.auth)
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID keys not set' }, { status: 500 })
  }
  if (!subs.length) return NextResponse.json({ error: 'No valid subscriptions (keys missing)' }, { status: 404 })
  webpush.setVapidDetails('mailto:support@joineventica.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
  const payload = JSON.stringify({ title: 'Eventica', body: 'Test notification', data: { url: '/tickets' } })
  type SendResult = { endpoint: string; ok: boolean; error?: string; statusCode?: number }
  const results: SendResult[] = await Promise.all(subs.map(s => webpush
    .sendNotification(s, payload)
    .then((): SendResult => ({ endpoint: s.endpoint, ok: true }))
    .catch((e: any): SendResult => ({ endpoint: s.endpoint, ok: false, error: String(e?.message || 'error'), statusCode: e?.statusCode }))
  ))
  const expired = results.filter((r: SendResult) => !r.ok && (r.statusCode === 410 || r.statusCode === 404))
  await Promise.all(expired.map((r: SendResult) => adminDb.collection('pushSubscriptions').doc(encodeEndpoint(r.endpoint)).delete()))
  // Dispatch log (non-blocking)
  try {
    await adminDb.collection('pushDispatchLogs').add({
      kind: 'test',
      title: 'Eventica',
      body: 'Test notification',
      url: '/tickets',
      sentCount: results.length,
      successCount: results.filter(r => r.ok).length,
      pruned: expired.map(e => e.endpoint),
      timestamp: new Date().toISOString()
    })
  } catch {}
  return NextResponse.json({ sent: results, pruned: expired.map((e: SendResult) => e.endpoint) })
}

export async function POST() {
  const { user, error: authError } = await requireAdmin()
  if (authError || !user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }
  return runTestSend()
}

export async function GET(request: Request) {
  const secret = process.env.PUSH_TEST_SECRET
  if (!secret) return NextResponse.json({ error: 'PUSH_TEST_SECRET not configured' }, { status: 501 })
  const token = new URL(request.url).searchParams.get('secret')
  if (token !== secret) return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  return runTestSend()
}
