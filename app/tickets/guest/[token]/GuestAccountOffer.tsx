'use client'

// The account OFFER — never a demand.
//
// The buyer already has their ticket by the time they see this; the page above it
// renders their QR code whether or not they ever click here. This is the "keep your
// tickets in the app" upsell, and taking it moves the guest order's tickets onto a
// real uid so they show up in /tickets like any other purchase.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GuestAccountOffer({
  token,
  email,
  alreadyClaimed,
}: {
  token: string
  email: string
  alreadyClaimed: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const returnTo = `/tickets/guest/${encodeURIComponent(token)}`
  const signupHref = `/auth/signup?redirect=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(email)}`
  const loginHref = `/auth/login?redirect=${encodeURIComponent(returnTo)}`

  async function handleAddToAccount() {
    setStatus('working')
    setMessage(null)
    try {
      const res = await fetch('/api/tickets/guest/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        // Not signed in yet — that is the whole point of the offer. Send them to
        // sign in and come straight back to this same page.
        window.location.href = loginHref
        return
      }
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error || 'Could not add these tickets to your account.')
        return
      }

      setStatus('done')
      setMessage('Your tickets are now in your account.')
      router.refresh()
    } catch {
      setStatus('error')
      setMessage('Could not reach Tikèm. Please try again.')
    }
  }

  if (alreadyClaimed && status !== 'error') {
    return (
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-white font-semibold">These tickets are in your Tikèm account.</p>
        <a
          href="/tickets"
          className="inline-block mt-3 text-sm font-semibold text-brand-400 hover:text-brand-300"
        >
          Open My Tickets →
        </a>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-white font-semibold">Keep your tickets in the app</p>
      <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
        Optional. Create a free account and these tickets move into it, so you never
        have to hunt for this link again.
      </p>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <a
          href={signupHref}
          className="flex-1 text-center bg-white hover:bg-white/90 text-black font-medium py-3 px-5 rounded-xl transition-colors min-h-[44px] flex items-center justify-center"
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
        <p
          className={`mt-3 text-sm ${status === 'error' ? 'text-red-300' : 'text-emerald-300'}`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
