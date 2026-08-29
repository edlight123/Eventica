'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, SlidersHorizontal } from 'lucide-react'
import { AdminBreadcrumbs } from './AdminBreadcrumbs'

interface PayoutOperationsClientProps {
  pendingPayoutsContent: React.ReactNode
  eventSettlementsContent: React.ReactNode
  withdrawalsContent: React.ReactNode
}

type TabId = 'pending' | 'settlements' | 'withdrawals'

interface Tab {
  id: TabId
  label: string
  badge?: number
}

export function PayoutOperationsClient({
  pendingPayoutsContent,
  eventSettlementsContent,
  withdrawalsContent,
}: PayoutOperationsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('settlements')

  // Open the correct tab from the URL hash so deep links like
  // `#withdrawals`, `#pending`, and `#settlements` work. Defaults to settlements.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '')
    if (hash === 'withdrawals' || hash === 'pending' || hash === 'settlements') {
      setActiveTab(hash)
    }
  }, [])

  const selectTab = (id: TabId) => {
    setActiveTab(id)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`)
    }
  }

  const tabs: Tab[] = [
    {
      id: 'pending',
      label: 'Pending Requests',
    },
    {
      id: 'settlements',
      label: 'Event Settlements',
    },
    {
      id: 'withdrawals',
      label: 'Withdrawal History',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Breadcrumbs */}
      <AdminBreadcrumbs items={[{ label: 'Payout Operations' }]} />

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h1 className="label-mono text-[15px] font-bold uppercase tracking-[0.14em] text-console-text">
            Payout Operations
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/disputes"
              className="inline-flex items-center gap-2 rounded bg-console-raise px-3 py-2 text-[13px] font-semibold text-console-mut transition-colors hover:text-console-text"
            >
              <ShieldAlert className="h-4 w-4" />
              Disputes
            </Link>
            <Link
              href="/admin/payouts/release-settings"
              className="inline-flex items-center gap-2 rounded bg-console-raise px-3 py-2 text-[13px] font-semibold text-console-mut transition-colors hover:text-console-text"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Release settings
            </Link>
          </div>
        </div>
        <p className="mt-2 hidden text-[13px] text-console-mut sm:block">
          Manage event disbursements, pending requests, and withdrawal history
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-console-raise sm:mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`label-mono inline-flex items-center gap-2 border-b-2 px-1 py-3 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  isActive
                    ? 'border-console-text text-console-text'
                    : 'border-transparent text-console-mut hover:text-console-text'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="label-mono tabular-nums text-console-mut">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'pending' && (
          <div>
            {pendingPayoutsContent}
          </div>
        )}

        {activeTab === 'settlements' && (
          <div>
            {eventSettlementsContent}
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div>
            {withdrawalsContent}
          </div>
        )}
      </div>
    </div>
  )
}
