'use client'

import { useState, useEffect } from 'react'

interface StickyMobileCTAProps {
  isFree: boolean
  ticketPrice: number
  currency: string
  remainingTickets: number
  isSoldOut: boolean
  ctaButton: React.ReactNode
}

export default function StickyMobileCTA({
  isFree,
  ticketPrice,
  currency,
  remainingTickets,
  isSoldOut,
  ctaButton
}: StickyMobileCTAProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Show when scrolling up or at the top, hide when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      <div className="px-4 pt-2 pb-0">
        <div className="flex items-center gap-2.5">
          {/* Price & Availability Info */}
          <div className="flex flex-col min-w-0 flex-shrink-0">
            {isFree ? (
              <p className="text-base font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent leading-tight">
                FREE
              </p>
            ) : (
              <div className="flex items-baseline leading-tight">
                <span className="text-lg font-bold text-gray-900">{ticketPrice}</span>
                <span className="text-[10px] text-gray-600 ml-1">{currency}</span>
              </div>
            )}
            <p className="text-[10px] text-gray-600 leading-tight mt-0.5">
              {isSoldOut ? 'Sold Out' : `${remainingTickets} left`}
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex-1 min-w-0">
            {ctaButton}
          </div>
        </div>
      </div>
    </div>
  )
}
