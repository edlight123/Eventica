'use client'

// The account OFFER — never a demand. Same posture as the guest ticket page: the
// promoter's stats are already on screen above this; claiming just aggregates
// every event they promote into one portal.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PromoterAccountOffer({
  token,
  alreadyClaimed,
}: {
  token: string
  alreadyClaimed: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const returnTo = `/promoter/${encodeURIComponent(token)}`
  const signupHref = `/auth/signup?redirect=${encodeURIComponent(returnTo)}`
  const loginHref = `/auth/login?redirect=${encodeURIComponent(returnTo)}`

  async function handleAddToAccount() {
    setStatus('working')
    setMessage(null)
    try {
      const res = await fetch('/api/promoter/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        // Not signed in yet — that is the whole point of the offer.
        window.location.href = loginHref
        return
      }
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error || 'Could not add this to your account.')
        return
      }

      setStatus('done')
      setMessage('This promoter page is now in your account.')
      router.refresh()
    } catch {
      setStatus('error')
      setMessage('Could not reach Tikèm. Please try again.')
    }
  }

  if (alreadyClaimed && status !== 'error') {
    return (
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-white font-semibold">This page is in your Tikèm account.</p>
        <a
          href="/promoter"
          className="inline-block mt-3 text-sm font-semibold text-brand-400 hover:text-brand-300"
        >
          Open your promoter portal →
        </a>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-white font-semibold">Promote more than one event?</p>
      <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
        Optional. Add this to a free Tikèm account and every event you promote shows up
        in one portal — this link keeps working either way.
      </p>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <a
          href={signupHref}
          className="flex-1 text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-5 rounded-xl transition-colors min-h-[44px] flex items-center justify-center"
        >
          Create an account
        </a>
        <button
          type="button"
          onClick={handleAddToAccount}
          disabled={status === 'working'}
          className="flex-1 border border-white/10 text-white/80 hover:bg-white/10 font-medium py-3 px-5 rounded-xl transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {status === 'working' ? 'Adding…' : 'I already have one'}
        </button>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${status === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
