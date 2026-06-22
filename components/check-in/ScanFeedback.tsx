'use client'

import { CheckCircle, XCircle, AlertCircle, User, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ScanResult {
  success: boolean
  message: string
  attendee?: {
    name: string
    email: string
    ticketType: string
    checkInTime?: string
  }
  type: 'success' | 'error' | 'warning' | 'already-checked'
}

interface ScanFeedbackProps {
  result: ScanResult | null
  onDismiss: () => void
}

export function ScanFeedback({ result, onDismiss }: ScanFeedbackProps) {
  if (!result) return null

  const getStyles = () => {
    switch (result.type) {
      case 'success':
        return {
          bg: 'bg-green-500',
          icon: CheckCircle,
          iconColor: 'text-white',
        }
      case 'already-checked':
        return {
          bg: 'bg-yellow-500',
          icon: AlertCircle,
          iconColor: 'text-white',
        }
      case 'error':
        return {
          bg: 'bg-red-500',
          icon: XCircle,
          iconColor: 'text-white',
        }
      default:
        return {
          bg: 'bg-amber-500',
          icon: AlertCircle,
          iconColor: 'text-white',
        }
    }
  }

  const { bg, icon: Icon, iconColor } = getStyles()

  // Auto-dismiss success after 2 seconds
  if (result.type === 'success') {
    setTimeout(() => onDismiss(), 2000)
  }

  return (
    <div className={`fixed inset-0 ${bg} z-40 flex items-center justify-center p-6 animate-in fade-in duration-200`}>
      <div className="text-center text-white max-w-md">
        <Icon className={`w-24 h-24 mx-auto mb-6 ${iconColor} drop-shadow-lg`} />
        
        <h2 className="text-3xl font-bold mb-2">{result.message}</h2>
        
        {result.attendee && (
          <div className="mt-6 bg-white/20 backdrop-blur rounded-xl p-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg">{result.attendee.name}</p>
                <p className="text-sm text-white/80">{result.attendee.email}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/80">Ticket Type:</span>
                <span className="font-semibold">{result.attendee.ticketType}</span>
              </div>
              
              {result.attendee.checkInTime && (
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Previously checked in:</span>
                  <span className="font-semibold flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(result.attendee.checkInTime), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {result.type !== 'success' && (
          <button
            onClick={onDismiss}
            className="mt-6 px-8 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Continue Scanning
          </button>
        )}
      </div>
    </div>
  )
}
