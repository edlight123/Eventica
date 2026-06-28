'use client'

import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'

interface MobilePurchaseBarProps {
  isFree: boolean
  price: number
  currency: string
  remainingTickets: number
  isSoldOut: boolean
  ctaButton: React.ReactNode
}

export function MobilePurchaseBar({
  isFree,
  price,
  currency,
  remainingTickets,
  isSoldOut,
  ctaButton,
}: MobilePurchaseBarProps) {
  const { t } = useTranslation('common')
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-hard z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Price Info */}
          <div className="flex-shrink-0">
            {isFree ? (
              <div>
                <p className="text-lg font-bold text-success-600">{t('common.free')}</p>
                <p className="text-xs text-gray-600">No payment required</p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-900">{price}</span>
                  <span className="text-xs text-gray-600">{currency}</span>
                </div>
                <p className="text-xs text-gray-600">
                  {isSoldOut ? t('ticket.sold_out') : t('ticket.remaining_short', { count: remainingTickets })}
                </p>
              </div>
            )}
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
