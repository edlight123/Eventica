'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

type TabId = 'overview' | 'attendees' | 'check-in' | 'staff' | 'earnings' | 'sales' | 'updates' | 'settings'

interface EventTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  eventId: string
  ticketCount: number
}

export function EventTabs({ activeTab, onTabChange, eventId, ticketCount }: EventTabsProps) {
  const { t } = useTranslation('common')
  
  const tabs = [
    { id: 'overview' as TabId, label: t('organizer.overview'), count: undefined, enabled: true },
    { id: 'attendees' as TabId, label: t('organizer.attendees'), count: ticketCount, enabled: true, href: `/organizer/events/${eventId}/attendees` },
    { id: 'check-in' as TabId, label: t('organizer.check_in'), count: undefined, enabled: true, href: `/organizer/scan/${eventId}` },
    { id: 'staff' as TabId, label: 'Staff', count: undefined, enabled: true, href: `/organizer/events/${eventId}/staff` },
    { id: 'earnings' as TabId, label: '💰 Earnings', count: undefined, enabled: true, href: `/organizer/events/${eventId}/earnings` },
    { id: 'sales' as TabId, label: t('organizer.sales'), count: undefined, enabled: false },
    { id: 'updates' as TabId, label: t('organizer.updates'), count: undefined, enabled: false },
    { id: 'settings' as TabId, label: t('organizer_dashboard.settings'), count: undefined, enabled: false },
  ]

  return (
    <div className="border-b border-gray-200 bg-white sticky top-[73px] md:top-[89px] z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
          {tabs.map((tab) => {
            if (!tab.enabled) {
              return (
                <button
                  key={tab.id}
                  disabled
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-400 cursor-not-allowed whitespace-nowrap"
                >
                  {tab.label}
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{t('organizer.coming_soon')}</span>
                </button>
              )
            }

            if (tab.href && tab.id !== 'overview') {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-brand-700 text-brand-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </Link>
              )
            }

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
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
