'use client'

import { Flashlight, SwitchCamera, Search, Volume2, VolumeX } from 'lucide-react'
import { useState } from 'react'

interface ScanBottomBarProps {
  onManualLookup: () => void
}

export function ScanBottomBar({ onManualLookup }: ScanBottomBarProps) {
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [soundOn, setSoundOn] = useState(true)

  const toggleFlashlight = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities() as any // Torch API is experimental
      
      if (capabilities.torch) {
        // @ts-ignore - Torch API not in TypeScript types yet
        await (track as any).applyConstraints({
          advanced: [{ torch: !flashlightOn }]
        })
        setFlashlightOn(!flashlightOn)
      }
    } catch (error) {
      console.error('Flashlight error:', error)
    }
  }

  return (
    <div className="sticky bottom-0 z-40 bg-black/40 backdrop-blur-lg border-t border-white/10">
      <div className="px-4 py-4">
        <div className="flex items-center justify-around gap-2">
          {/* Flashlight */}
          <button
            onClick={toggleFlashlight}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              flashlightOn
                ? 'bg-brand-600 text-white'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <Flashlight className="w-6 h-6" />
            <span className="text-xs font-medium">Flash</span>
          </button>

          {/* Manual Lookup */}
          <button
            onClick={onManualLookup}
            className="flex flex-col items-center gap-1 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors"
          >
            <Search className="w-6 h-6" />
            <span className="text-xs font-medium">Manual</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              soundOn
                ? 'text-white hover:bg-white/20'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {soundOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            <span className="text-xs font-medium">Sound</span>
          </button>
        </div>
      </div>
    </div>
  )
}
