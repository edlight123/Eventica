'use client'

import { useSystemStatus } from '@/lib/realtime/AdminRealtimeProvider'
import { ConsoleState } from '@/components/admin/console'
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
      <ConsoleState tone={isConnected ? 'good' : 'bad'}>
        {isConnected ? 'Live' : 'Offline'}
      </ConsoleState>

      {/* Last Update Time */}
      {lastUpdate && (
        <span className="text-console-faint">
          · Updated <span className="font-mono tabular-nums">{timeSinceUpdate}</span>
        </span>
      )}
    </div>
  )
}
