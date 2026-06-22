'use client'

import { X, Users, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DoorModeTopBarProps {
  eventTitle: string
  eventId: string
  exitHref?: string
  entryPoint: string
  entryPoints: string[]
  onEntryPointChange: (point: string) => void
  checkedInCount: number
  remainingCount: number
}

export function DoorModeTopBar({
  eventTitle,
  eventId,
  exitHref,
  entryPoint,
  entryPoints,
  onEntryPointChange,
  checkedInCount,
  remainingCount,
}: DoorModeTopBarProps) {
  const router = useRouter()
  const totalTickets = checkedInCount + remainingCount

  const resolvedExitHref = exitHref || `/organizer/scan`

  return (
    <div className="sticky top-0 z-50 bg-gray-900 text-white border-b border-gray-700">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Event Title */}
          <h1 className="text-lg font-bold truncate flex-1">{eventTitle}</h1>

          {/* Exit Button */}
          <button
            onClick={() => router.push(resolvedExitHref)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Entry Point Selector */}
          <select
            value={entryPoint}
            onChange={(e) => onEntryPointChange(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {entryPoints.map((point) => (
              <option key={point} value={point}>
                {point}
              </option>
            ))}
          </select>

          {/* Live Counters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-700/50 rounded-lg">
              <UserCheck className="w-4 h-4 text-green-400" />
              <div className="text-right">
                <div className="text-xs text-green-400 font-medium">Checked In</div>
                <div className="text-lg font-bold text-green-300">{checkedInCount}/{totalTickets}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-900/30 border border-brand-700/50 rounded-lg">
              <Users className="w-4 h-4 text-brand-400" />
              <div className="text-right">
                <div className="text-xs text-brand-400 font-medium">Remaining</div>
                <div className="text-lg font-bold text-brand-300">{remainingCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
