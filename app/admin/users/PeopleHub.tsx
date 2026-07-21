'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Users as UsersIcon, Briefcase } from 'lucide-react'
import AdminUsersClient from './AdminUsersClient'
import AdminOrganizersClient from '../organizers/AdminOrganizersClient'

type PeopleTab = 'all' | 'organizers'

interface PeopleHubProps {
  counts: { total: number; organizers: number; verified: number }
  allUsers: any[]
  allUsersHasMore: boolean
  allUsersCursor: string | null
  organizerUsers: any[]
  organizerHasMore: boolean
  organizerCursor: string | null
}

/**
 * Unified People hub: all users (browsable list + search) + organizers (list)
 * under one route with tabs. `/admin/organizers` redirects here with
 * `?tab=organizers`.
 */
export default function PeopleHub({
  counts,
  allUsers,
  allUsersHasMore,
  allUsersCursor,
  organizerUsers,
  organizerHasMore,
  organizerCursor,
}: PeopleHubProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initial: PeopleTab = searchParams.get('tab') === 'organizers' ? 'organizers' : 'all'
  const [tab, setTab] = useState<PeopleTab>(initial)

  const selectTab = (key: PeopleTab) => {
    setTab(key)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (key === 'all') params.delete('tab')
    else params.set('tab', key)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const tabs: { key: PeopleTab; label: string; Icon: typeof UsersIcon }[] = [
    { key: 'all', label: 'All users', Icon: UsersIcon },
    { key: 'organizers', label: 'Organizers', Icon: Briefcase },
  ]

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div
          className="inline-flex gap-1 rounded-full border border-white/10 p-1"
          role="tablist"
          aria-label="People"
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

      <div role="tabpanel" aria-label="All users" className={tab === 'all' ? '' : 'hidden'}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AdminUsersClient
            counts={counts}
            initialUsers={allUsers}
            initialHasMore={allUsersHasMore}
            initialCursor={allUsersCursor}
          />
        </div>
      </div>
      <div role="tabpanel" aria-label="Organizers" className={tab === 'organizers' ? '' : 'hidden'}>
        <AdminOrganizersClient
          counts={counts}
          initialUsers={organizerUsers}
          initialHasMore={organizerHasMore}
          initialCursor={organizerCursor}
        />
      </div>
    </div>
  )
}
