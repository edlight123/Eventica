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
    <div className="border-b border-gray-200 bg-white">
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
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-bold
                    ${isActive
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-gray-100 text-gray-600'
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
