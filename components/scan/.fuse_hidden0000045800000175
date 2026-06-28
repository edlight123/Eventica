'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import type { CheckInResult } from '@/lib/scan/checkInTicket'

interface ScanResultOverlayProps {
  result: CheckInResult
  onClose: () => void
  onOverride?: () => void
}

export function ScanResultOverlay({ result, onClose, onOverride }: ScanResultOverlayProps) {
  useEffect(() => {
    // Haptic feedback (if supported)
    if ('vibrate' in navigator) {
      if (result.success) {
        navigator.vibrate(200) // Success vibration
      } else if (result.type === 'ALREADY_CHECKED_IN') {
        navigator.vibrate([100, 50, 100]) // Warning pattern
      } else {
        navigator.vibrate([50, 50, 50]) // Error pattern
      }
    }

    // Audio feedback (optional - could add beep sounds)
  }, [result])

  if (result.success && result.type === 'VALID') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-green-500 shadow-2xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
              <CheckCircle className="w-12 h-12 text-white" strokeWidth={3} />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">✅ VALID</h2>
            
            <div className="bg-black/20 rounded-xl p-4 mb-4 text-left">
              <div className="text-green-100 space-y-2">
                <div>
                  <div className="text-xs text-green-300 uppercase tracking-wide">Attendee</div>
                  <div className="text-xl font-bold">{result.attendeeName}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-green-300 uppercase tracking-wide">Ticket Type</div>
                    <div className="font-semibold">{result.ticketType}</div>
                  </div>
                  <div>
                    <div className="text-xs text-green-300 uppercase tracking-wide">Quantity</div>
                    <div className="font-semibold">{result.quantity}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-green-300 uppercase tracking-wide">Entry Point</div>
                  <div className="font-semibold">{result.entryPoint}</div>
                </div>
              </div>
            </div>
            
            <p className="text-green-200 font-medium text-lg">Checked in now</p>
          </div>
        </div>
      </div>
    )
  }

  if (result.type === 'ALREADY_CHECKED_IN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-yellow-500 shadow-2xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
              <AlertTriangle className="w-12 h-12 text-white" strokeWidth={3} />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">⚠️ ALREADY CHECKED-IN</h2>
            
            <div className="bg-black/20 rounded-xl p-4 mb-4 text-left">
              <div className="text-yellow-100 space-y-2">
                <div>
                  <div className="text-xs text-yellow-300 uppercase tracking-wide">Attendee</div>
                  <div className="text-xl font-bold">{result.attendeeName}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-yellow-300 uppercase tracking-wide">Previous Check-in</div>
                    <div className="font-semibold">
                      {new Date(result.checkedInAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-yellow-300 uppercase tracking-wide">Entry Point</div>
                    <div className="font-semibold">{result.entryPoint}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {result.allowReentry ? (
              <button
                onClick={onOverride}
                className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl transition-colors mb-2"
              >
                Override / Allow Re-entry
              </button>
            ) : (
              <p className="text-yellow-200 font-medium">Re-entry not allowed</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // INVALID state
  const reasonText = {
    NOT_FOUND: 'Ticket not found',
    WRONG_EVENT: 'Wrong event',
    REFUNDED: 'Ticket refunded',
    CANCELLED: 'Ticket cancelled',
    PENDING_PAYMENT: 'Payment pending',
  }[result.reason]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-red-900 to-red-800 rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-red-500 shadow-2xl">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
            <XCircle className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">❌ INVALID</h2>
          
          <div className="bg-black/20 rounded-xl p-4 mb-4">
            <div className="text-red-100">
              <div className="text-xs text-red-300 uppercase tracking-wide mb-1">Reason</div>
              <div className="text-xl font-bold">{reasonText}</div>
            </div>
          </div>
          
          <p className="text-red-200 font-medium">Cannot check in</p>
        </div>
      </div>
    </div>
  )
}
