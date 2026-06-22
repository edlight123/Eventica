'use client'

import { TabValidation } from '@/lib/event-validation'
import { Check, AlertCircle, FileText, MapPin, Clock, Ticket, Tag } from 'lucide-react'

interface StepperTabsProps {
  tabs: TabValidation[]
  currentTab: string
  onTabChange: (tabId: string) => void
}

const TAB_ICONS: Record<string, any> = {
  basic: FileText,
  location: MapPin,
  schedule: Clock,
  tickets: Ticket,
  details: Tag
}

export function StepperTabs({ tabs, currentTab, onTabChange }: StepperTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Tabs */}
        <div className="hidden md:flex items-center justify-between">
          {tabs.map((tab, index) => {
            const Icon = TAB_ICONS[tab.id] || FileText
            const isActive = currentTab === tab.id
            const isCompleted = tab.isComplete
            const hasWarnings = tab.warnings.length > 0
            const isPast = tabs.findIndex(t => t.id === currentTab) > index

            return (
              <div key={tab.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex items-center gap-3 px-4 py-4 transition-all flex-1 group ${
                    isActive
                      ? 'border-b-4'
                      : 'border-b-4 border-transparent hover:border-gray-200'
                  }`}
                  style={{
                    borderBottomColor: isActive ? '#0F766E' : undefined
                  }}
                >
                  {/* Step Number/Status Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isActive
                      ? 'bg-brand-700 text-white shadow-md'
                      : isCompleted
                      ? 'bg-green-100 text-green-700 group-hover:bg-green-200'
                      : hasWarnings || tab.missingFields.length > 0
                      ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }`}>
                    {isCompleted && !isActive ? (
                      <Check className="w-5 h-5" />
                    ) : (tab.missingFields.length > 0 || hasWarnings) && !isActive ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Tab Label */}
                  <div className="text-left flex-1">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${
                      isActive
                        ? 'text-brand-700'
                        : isPast
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`}>
                      Step {index + 1}
                    </p>
                    <p className={`font-bold text-sm ${
                      isActive
                        ? 'text-gray-900'
                        : 'text-gray-700 group-hover:text-gray-900'
                    }`}>
                      {tab.title}
                    </p>
                    
                    {/* Status Indicators */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isCompleted ? (
                        <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Complete
                        </span>
                      ) : tab.missingFields.length > 0 ? (
                        <span className="text-xs text-amber-600 font-medium">
                          {tab.missingFields.length} missing
                        </span>
                      ) : null}
                      {hasWarnings && (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {tab.warnings.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Completion Badge */}
                  {isCompleted && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>

                {/* Connector Line */}
                {index < tabs.length - 1 && (
                  <div className={`h-0.5 w-8 transition-all ${
                    isPast || isCompleted
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile Dropdown */}
        <div className="md:hidden py-3">
          <div className="relative">
            <select
              value={currentTab}
              onChange={(e) => onTabChange(e.target.value)}
              className="w-full px-4 py-3 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 appearance-none font-semibold text-gray-900"
            >
              {tabs.map((tab, index) => {
                const Icon = TAB_ICONS[tab.id] || FileText
                return (
                  <option key={tab.id} value={tab.id}>
                    {tab.isComplete ? '✅' : tab.missingFields.length > 0 ? '⚠️' : '○'} Step {index + 1}: {tab.title}
                  </option>
                )
              })}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Mobile Status Summary */}
          <div className="mt-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {tabs.find(t => t.id === currentTab)?.isComplete ? (
                <span className="flex items-center gap-1 text-green-700 font-medium">
                  <Check className="w-4 h-4" />
                  Complete
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {tabs.find(t => t.id === currentTab)?.missingFields.length || 0} missing
                </span>
              )}
            </div>
            <span className="text-gray-500">
              {tabs.filter(t => t.isComplete).length} of {tabs.length} complete
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
