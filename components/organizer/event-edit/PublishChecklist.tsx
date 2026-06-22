'use client'

import { Check, AlertCircle, ChevronRight } from 'lucide-react'

interface PublishChecklistProps {
  blockingIssues: Array<{
    tab: string
    tabId: string
    issue: string
  }>
  onNavigateToTab: (tabId: string) => void
  canPublish: boolean
}

export function PublishChecklist({ blockingIssues, onNavigateToTab, canPublish }: PublishChecklistProps) {
  if (canPublish) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-green-900 mb-2">
              Ready to Publish! 🎉
            </h3>
            <p className="text-green-800 mb-4">
              All required information is complete. Your event is ready to go live.
            </p>
            <div className="bg-white/60 rounded-lg p-3 border border-green-200">
              <p className="text-sm text-green-900 font-medium">
                Click the <strong className="text-brand-700">Publish</strong> button in the header to make your event visible to attendees.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-amber-200 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-7 h-7 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Publish Readiness Checklist
          </h3>
          <p className="text-gray-600 text-sm">
            Complete these {blockingIssues.length} required item{blockingIssues.length !== 1 ? 's' : ''} to publish your event
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {blockingIssues.map((item, index) => (
          <button
            key={`${item.tabId}-${index}`}
            type="button"
            onClick={() => onNavigateToTab(item.tabId)}
            className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all group text-left"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="w-5 h-5 rounded-full border-2 border-amber-400 flex-shrink-0 mt-0.5"></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {item.issue}
                </p>
                <p className="text-xs text-amber-700 mt-0.5 font-medium">
                  {item.tab} section
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>

      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Click any item to jump to that section
        </p>
      </div>
    </div>
  )
}
