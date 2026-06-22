'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { becomeOrganizer } from './actions'

function sanitizeRedirectTarget(target: string | undefined | null): string {
  if (!target) return '/organizer'
  if (!target.startsWith('/')) return '/organizer'
  if (target.startsWith('//')) return '/organizer'
  return target
}

export default function OrganizerUpgradePrompt({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const safeRedirect = sanitizeRedirectTarget(redirectTo)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">Become an Organizer</h1>
        <p className="mt-2 text-gray-600">
          Create events, manage tickets, and request payouts. You can start with draft events anytime. Publishing paid events requires verification.
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                try {
                  await becomeOrganizer()
                  router.push(safeRedirect)
                  router.refresh()
                } catch (e: any) {
                  setError(e?.message || 'Unable to upgrade your account right now')
                }
              })
            }}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Upgrading…' : 'Continue as Organizer'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/discover')}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Browse Events
          </button>
        </div>
      </div>
    </div>
  )
}
