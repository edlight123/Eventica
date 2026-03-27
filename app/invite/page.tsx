'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase/client'
import { onAuthStateChanged } from 'firebase/auth'

type Status = 'loading' | 'ready' | 'success' | 'error'

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = useMemo(() => searchParams.get('eventId') || '', [searchParams])
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const appInviteUrl = useMemo(() => {
    if (!eventId || !token) return ''
    return `eventica://invite?eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(token)}`
  }, [eventId, token])

  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  }, [])

  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if ((!eventId || !token) && typeof window !== 'undefined') {
      // If the query params were lost (common after auth redirects), recover the invite from storage.
      try {
        const raw = window.localStorage.getItem('eh:pendingInvite')
        if (raw) {
          const parsed = JSON.parse(raw) as { eventId?: string; token?: string; createdAt?: number }
          const storedEventId = String(parsed?.eventId || '')
          const storedToken = String(parsed?.token || '')
          if (storedEventId && storedToken) {
            router.replace(
              `/invite?eventId=${encodeURIComponent(storedEventId)}&token=${encodeURIComponent(storedToken)}`
            )
            return
          }
        }
      } catch {
        // ignore
      }
    }

    if (!eventId || !token) {
      setStatus('error')
      setMessage('Invalid invite link.')
      return
    }

    // Persist the invite so a login roundtrip can continue without re-pasting the link.
    // This is safe because the token is already present in the URL.
    try {
      if (typeof window !== 'undefined') {
        const redirect = `/invite?eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(token)}`
        window.localStorage.setItem('eh:pendingRedirect', redirect)
        window.localStorage.setItem(
          'eh:pendingInvite',
          JSON.stringify({ eventId, token, createdAt: Date.now() })
        )
      }
    } catch {
      // ignore storage failures
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        const redirect = `/invite?eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(token)}`
        router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`)
        return
      }

      setStatus('ready')
      try {
        const res = await fetch('/api/staff/invites/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, token }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          const code = String(json?.code || '')
          const friendly =
            code === 'already-exists'
              ? 'This invite was already claimed.'
              : code === 'deadline-exceeded'
                ? 'This invite has expired.'
                : code === 'permission-denied'
                  ? 'This invite is restricted to a different account.'
                  : code === 'not-found'
                    ? 'Invite not found.'
                    : String(json?.error || 'Failed to redeem invite.')

          setStatus('error')
          setMessage(friendly)
          return
        }

        setStatus('success')
        setMessage('Invite accepted. Redirecting…')
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('eh:pendingRedirect')
            window.localStorage.removeItem('eh:pendingInvite')
          }
        } catch {
          // ignore
        }
        router.replace(`/organizer/scan/${encodeURIComponent(eventId)}`)
      } catch (err: any) {
        setStatus('error')
        setMessage(err?.message || 'Failed to redeem invite.')
      }
    })

    return () => unsubscribe()
  }, [eventId, token, router, isMobile])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Event Invite</h1>
        <p className="mt-2 text-sm text-gray-600">
          {status === 'loading' && 'Loading…'}
          {status === 'ready' && 'Accepting invite…'}
          {status === 'success' && message}
          {status === 'error' && message}
        </p>

        {isMobile && status !== 'error' && appInviteUrl ? (
          <div className="mt-5 space-y-3">
            <a
              href={appInviteUrl}
              className="block w-full text-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Open in app
            </a>
            <p className="text-xs text-gray-500">
              If you don’t have the app installed, you can still accept on desktop.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
