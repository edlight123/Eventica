'use client'

import { useSystemStatus } from '@/lib/realtime/AdminRealtimeProvider'
import { useEffect, useState } from 'react'

export function RealtimeConnectionStatus() {
  const { isConnected, lastUpdate } = useSystemStatus()
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('')

  useEffect(() => {
    const updateTimer = () => {
      if (lastUpdate) {
        const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
        if (seconds < 5) {
          setTimeSinceUpdate('just now')
        } else if (seconds < 60) {
          setTimeSinceUpdate(`${seconds}s ago`)
        } else {
          setTimeSinceUpdate(`${Math.floor(seconds / 60)}m ago`)
        }
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [lastUpdate])

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Connection Indicator */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${
          isConnected 
            ? 'bg-green-500 shadow-sm shadow-green-500/50' 
            : 'bg-gray-400'
        }`}>
          {isConnected && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
          )}
        </div>
        <span className={isConnected ? 'text-green-700' : 'text-gray-500'}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Last Update Time */}
      {lastUpdate && (
        <span className="text-gray-500">
          · Updated {timeSinceUpdate}
        </span>
      )}
    </div>
  )
}
