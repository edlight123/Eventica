'use client'

import { Calendar, FileText, History, XCircle } from 'lucide-react'

export type EventTabType = 'upcoming' | 'drafts' | 'past' | 'cancelled'

interface Tab {
  id: EventTabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const tabs: Tab[] = [
  {
    id: 'upcoming',
    label: 'Upcoming',
    icon: Calendar,
    color: 'teal'
  },
  {
    id: 'drafts',
    label: 'Drafts',
    icon: FileText,
    color: 'gray'
  },
  {
    id: 'past',
    label: 'Past',
    icon: History,
    color: 'blue'
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    icon: XCircle,
    color: 'red'
  }
]

interface OrganizerEventsTabsProps {
  activeTab: EventTabType
  onTabChange: (tab: EventTabType) => void
  counts: {
    upcoming: number
    drafts: number
    past: number
    cancelled: number
  }
}

export default function OrganizerEventsTabs({
  activeTab,
  onTabChange,
  counts
}: OrganizerEventsTabsProps) {
  const getTabStyles = (_tab: Tab, isActive: boolean) => {
    const baseStyles = 'flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 relative'
    if (isActive) {
      return `${baseStyles} bg-brand-700 text-white shadow-sm`
    }
    return `${baseStyles} text-white/60 hover:bg-[#1c1c1c] hover:text-white`
  }

  const getCountBadgeStyles = (_tab: Tab, isActive: boolean) => {
    const baseStyles = 'ml-2 px-2 py-0.5 text-xs font-bold rounded-full'
    if (isActive) {
      return `${baseStyles} bg-white/20 text-white`
    }
    return `${baseStyles} bg-[#1c1c1c] text-white/70`
  }

  return (
    <div className="bg-[#141414] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Desktop Tabs */}
        <div className="hidden md:flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = counts[tab.id]

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={getTabStyles(tab, isActive)}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={getCountBadgeStyles(tab, isActive)}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Mobile Dropdown */}
        <div className="md:hidden">
          <select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value as EventTabType)}
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/15 rounded-xl text-sm font-medium text-white/70 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          >
            {tabs.map((tab) => {
              const count = counts[tab.id]
              return (
                <option key={tab.id} value={tab.id}>
                  {tab.label} {count > 0 ? `(${count})` : ''}
                </option>
              )
            })}
          </select>
        </div>
      </div>
    </div>
  )
}
