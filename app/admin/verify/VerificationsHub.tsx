'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, Landmark } from 'lucide-react'
import AdminVerifyClient from './AdminVerifyClient'
import BankVerificationsClient from '../bank-verifications/BankVerificationsClient'

type HubTab = 'identity' | 'bank'

/**
 * Unified Verifications hub: identity (organizer) verification + bank-account
 * verification under one route with tabs. `/admin/bank-verifications` redirects
 * here with `?tab=bank`. The Bank panel is lazy-mounted on first open so its
 * client-side fetch only runs when needed.
 */
export default function VerificationsHub({
  requestsWithUsers,
  organizers,
}: {
  requestsWithUsers: any[]
  organizers: any[]
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initial: HubTab = searchParams.get('tab') === 'bank' ? 'bank' : 'identity'
  const [tab, setTab] = useState<HubTab>(initial)
  const [bankVisited, setBankVisited] = useState(initial === 'bank')

  const selectTab = (key: HubTab) => {
    setTab(key)
    if (key === 'bank') setBankVisited(true)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (key === 'identity') params.delete('tab')
    else params.set('tab', key)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const tabs: { key: HubTab; label: string; Icon: typeof ShieldCheck }[] = [
    { key: 'identity', label: 'Identity', Icon: ShieldCheck },
    { key: 'bank', label: 'Bank accounts', Icon: Landmark },
  ]

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <div
          className="inline-flex gap-1 rounded-full border border-white/10 p-1"
          role="tablist"
          aria-label="Verifications"
        >
          {tabs.map(({ key, label, Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(key)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div role="tabpanel" aria-label="Identity" className={tab === 'identity' ? '' : 'hidden'}>
        <AdminVerifyClient requestsWithUsers={requestsWithUsers} organizers={organizers} />
      </div>
      <div role="tabpanel" aria-label="Bank accounts" className={tab === 'bank' ? '' : 'hidden'}>
        {bankVisited && <BankVerificationsClient />}
      </div>
    </div>
  )
}
