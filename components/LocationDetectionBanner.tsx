'use client'

import { useState, useEffect } from 'react'
import { MapPin, X, ChevronRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { updateUserProfile } from '@/lib/firestore/user-profile'

interface DetectedLocation {
  detected: boolean
  raw?: {
    country: string
    countryCode: string
    city: string
    region: string
  }
  mapped?: {
    countryCode: string
    countryName: string
    city: string | null
    isSupported: boolean
  }
  displayName?: string
}

interface LocationDetectionBannerProps {
  userId?: string
  currentCountry?: string
  currentCity?: string
  onLocationAccepted?: (countryCode: string, city: string | null) => void
}

export function LocationDetectionBanner({ 
  userId, 
  currentCountry,
  currentCity,
  onLocationAccepted 
}: LocationDetectionBannerProps) {
  const { t } = useTranslation('common')
  const [location, setLocation] = useState<DetectedLocation | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed or has a location set
    const dismissed = localStorage.getItem('location-banner-dismissed')
    const hasLocation = currentCountry && currentCountry !== 'HT'
    
    if (dismissed || hasLocation) {
      setIsLoading(false)
      return
    }

    // Detect location
    const detectLocation = async () => {
      try {
        const response = await fetch('/api/geolocation')
        const data = await response.json()
        
        if (data.detected && data.mapped?.isSupported) {
          // Only show if detected country is different from current
          if (data.mapped.countryCode !== currentCountry) {
            setLocation(data)
            setIsVisible(true)
            // Trigger animation after a small delay
            setTimeout(() => setHasAnimatedIn(true), 50)
          }
        }
      } catch (error) {
        console.error('Failed to detect location:', error)
      } finally {
        setIsLoading(false)
      }
    }

    detectLocation()
  }, [currentCountry])

  const handleAccept = async () => {
    if (!location?.mapped) return
    
    setIsAccepting(true)
    
    try {
      // Determine the subarea (state/region) from raw detection
      const detectedSubarea = location.raw?.region || ''
      
      // Save to profile if logged in - include country, city, AND subarea
      if (userId) {
        await updateUserProfile(userId, {
          defaultCountry: location.mapped.countryCode,
          defaultCity: location.mapped.city || '',
          defaultSubarea: detectedSubarea,
        })
      }
      
      // Save to localStorage for anonymous users
      localStorage.setItem('detected-location', JSON.stringify({
        countryCode: location.mapped.countryCode,
        city: location.mapped.city,
        subarea: detectedSubarea
      }))
      
      // Mark as accepted
      localStorage.setItem('location-banner-dismissed', 'accepted')
      
      // Callback
      onLocationAccepted?.(location.mapped.countryCode, location.mapped.city)
      
      // Animate out
      setHasAnimatedIn(false)
      setTimeout(() => setIsVisible(false), 300)
      
      // Reload to apply new location
      setTimeout(() => window.location.reload(), 400)
    } catch (error) {
      console.error('Failed to save location:', error)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('location-banner-dismissed', 'dismissed')
    setHasAnimatedIn(false)
    setTimeout(() => setIsVisible(false), 300)
  }

  if (isLoading || !isVisible || !location) {
    return null
  }

  return (
    <div 
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg
        transition-all duration-300 ease-out
        ${hasAnimatedIn 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-4'
        }
      `}
    >
      {/* Premium frosted glass card */}
      <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
        
        {/* Subtle background glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-brand-400/20 to-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-brand-400/20 to-brand-600/20 rounded-full blur-3xl" />
        
        <div className="relative p-4 sm:p-5">
          <div className="flex items-start gap-4">
            {/* Animated location icon */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-xl bg-teal-500/30 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                  Location Detected
                </span>
              </div>
              
              <p className="text-gray-900 font-medium mb-0.5">
                It looks like you&apos;re in
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {location.displayName}
              </p>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="
                    group relative flex items-center gap-2 px-4 py-2.5 
                    bg-gradient-to-r from-gray-900 to-gray-800
                    text-white text-sm font-semibold rounded-xl
                    shadow-lg shadow-gray-900/20
                    hover:shadow-xl hover:shadow-gray-900/30 hover:scale-[1.02]
                    active:scale-[0.98]
                    disabled:opacity-70 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                >
                  {isAccepting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Use this location</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleDismiss}
                  className="
                    px-4 py-2.5 text-sm font-medium text-gray-600
                    hover:text-gray-900 hover:bg-gray-100 
                    rounded-xl transition-all duration-200
                  "
                >
                  Not now
                </button>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="
                flex-shrink-0 p-1.5 text-gray-400 
                hover:text-gray-600 hover:bg-gray-100 
                rounded-lg transition-colors
              "
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
