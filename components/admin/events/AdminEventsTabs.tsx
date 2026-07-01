'use client'

interface Tab {
  id: 'pending' | 'published' | 'reported' | 'unpublished'
  label: string
  count: number
}

interface AdminEventsTabsProps {
  activeTab: Tab['id']
  onTabChange: (tab: Tab['id']) => void
  tabs: Tab[]
}

export function AdminEventsTabs({ activeTab, onTabChange, tabs }: AdminEventsTabsProps) {
  return (
    <div className="border-b border-white/10 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${isActive
                    ? 'border-brand-500 text-brand-300'
                    : 'border-transparent text-white/50 hover:text-white/70 hover:border-white/10'
                  }
                `}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`
                    px-2 py-0.5 rounded-full font-mono text-xs font-bold tabular-nums
                    ${isActive
                      ? 'text-brand-300'
                      : 'bg-[#0a0a0a] text-white/60'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
