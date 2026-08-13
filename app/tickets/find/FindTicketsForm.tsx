'use client'

import { useState } from 'react'

export default function FindTicketsForm() {
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = contact.trim()
    if (!value) return

    setStatus('sending')
    // One field, two meanings: anything with an "@" is an email, anything else is
    // treated as a phone number. The server normalizes both.
    const payload = value.includes('@') ? { email: value } : { phone: value }

    try {
      await fetch('/api/tickets/guest/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      // The confirmation below is deliberately unconditional — it must not become an
      // oracle for "does this email have tickets?", and a network blip is not a reason
      // to leak that either way.
    }
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-6 text-center">
        <p className="text-emerald-300 font-semibold">Check your messages</p>
        <p className="text-sm text-white/70 mt-2 leading-relaxed">
          If we have tickets for that email or phone number, the link is on its way to
          it now.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact" className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">
          Email or phone
        </label>
        <input
          id="contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          disabled={status === 'sending'}
          placeholder="you@example.com"
          className="w-full rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-brand-500 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending' || !contact.trim()}
        className="block w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-5 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
      >
        {status === 'sending' ? 'Sending…' : 'Send my ticket link'}
      </button>
    </form>
  )
}
