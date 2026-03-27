'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import { isDemoMode } from '@/lib/demo'
import { normalizeCountryCode } from '@/lib/payment-provider'
import EventbriteStyleTicketSelector from '@/components/EventbriteStyleTicketSelector'
import BottomSheet from '@/components/ui/BottomSheet'
import { useToast } from '@/components/ui/Toast'
import dynamic from 'next/dynamic'

const EmbeddedStripePayment = dynamic(() => import('./EmbeddedStripePayment'), { ssr: false })

interface BuyTicketButtonProps {
  eventId: string
  userId: string
  isFree: boolean
  ticketPrice: number
  eventTitle?: string
  currency?: string
  country?: string
}

export default function BuyTicketButton({ eventId, userId, isFree, ticketPrice, eventTitle = 'Event', currency = 'HTG', country }: BuyTicketButtonProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { showToast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [showTieredModal, setShowTieredModal] = useState(false)
  const [showEmbeddedPayment, setShowEmbeddedPayment] = useState(false)
  const [tierProbeLoading, setTierProbeLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'moncash' | 'natcash' | 'sogepay'>('stripe')
  const [quantity, setQuantity] = useState(1)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [selectedTierPrice, setSelectedTierPrice] = useState<number>(0)
  const [selectedTiers, setSelectedTiers] = useState<{ tierId: string; quantity: number; price: number; tierName?: string }[]>([])
  // Stores the promo code ID (promo_codes.id) once validated.
  const [promoCode, setPromoCode] = useState<string | undefined>()
  const [isMonCashPopupOpen, setIsMonCashPopupOpen] = useState(false)
  const moncashPopupRef = useRef<Window | null>(null)

  const countryCode = normalizeCountryCode(country)
  const isHaitiEvent = countryCode === 'HT'

  async function handleOpenPurchaseFlow() {
    if (loading || tierProbeLoading) return
    setError(null)

    // Prefer tiered checkout when tiers exist; otherwise fall back to the legacy
    // single-price purchase modal (this matches the empty-state guidance shown
    // in the tier selector).
    setTierProbeLoading(true)
    try {
      const res = await fetch(`/api/ticket-tiers?eventId=${encodeURIComponent(String(eventId))}`)
      const data = await res.json().catch(() => ({}))
      const tiers = Array.isArray(data?.tiers) ? data.tiers : []

      if (tiers.length > 0) {
        setShowTieredModal(true)
      } else {
        setShowModal(true)
      }
    } catch {
      setShowModal(true)
    } finally {
      setTierProbeLoading(false)
    }
  }

  const [usdHtgQuote, setUsdHtgQuote] = useState<null | {
    baseRate: number
    effectiveRate: number
    spreadPercent: number
    provider: string
    fetchedAtIso: string
    amountUsd: number
    amountHtg: number
    chargeCurrency: string
  }>(null)
  const [usdHtgQuoteError, setUsdHtgQuoteError] = useState<string | null>(null)
  const [usdHtgQuoteLoading, setUsdHtgQuoteLoading] = useState(false)

  const totalAmountDisplay = useMemo(() => {
    return selectedTiers.length > 0
      ? selectedTiers.reduce((sum, t) => sum + t.price * t.quantity, 0)
      : (selectedTierPrice || ticketPrice) * quantity
  }, [quantity, selectedTierPrice, selectedTiers, ticketPrice])

  useEffect(() => {
    if (!showModal) return
    if (!isHaitiEvent) {
      setUsdHtgQuote(null)
      setUsdHtgQuoteError(null)
      setUsdHtgQuoteLoading(false)
      return
    }
    if (String(currency || 'HTG').toUpperCase() !== 'USD') {
      setUsdHtgQuote(null)
      setUsdHtgQuoteError(null)
      setUsdHtgQuoteLoading(false)
      return
    }

    // Only Haiti events can settle USD-priced tickets in HTG via local mobile money.
    // If the user is paying by card, we charge in the event currency.
    if (paymentMethod === 'stripe') {
      setUsdHtgQuote(null)
      setUsdHtgQuoteError(null)
      setUsdHtgQuoteLoading(false)
      return
    }

    const amountUsd = Number(totalAmountDisplay)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return

    const controller = new AbortController()
    const run = async () => {
      setUsdHtgQuoteLoading(true)
      setUsdHtgQuoteError(null)
      try {
        const url = `/api/fx/usd-htg-quote?amount=${encodeURIComponent(String(amountUsd))}`
        const res = await fetch(url, { signal: controller.signal })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to fetch exchange rate')
        }
        setUsdHtgQuote(data)
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setUsdHtgQuote(null)
        setUsdHtgQuoteError(err?.message || 'Failed to fetch exchange rate')
      } finally {
        setUsdHtgQuoteLoading(false)
      }
    }

    run()
    return () => controller.abort()
  }, [currency, isHaitiEvent, paymentMethod, showModal, totalAmountDisplay])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data: any = event.data
      if (!data || data.source !== 'eventica' || data.type !== 'purchase_result') return

      // Payment completed in the popup; remove blurred backdrop.
      setIsMonCashPopupOpen(false)
      moncashPopupRef.current = null

      if (data.status === 'success') {
        const ticketId = data.ticketId || data.ticket_id
        if (ticketId) {
          router.push(`/purchase/success?ticketId=${encodeURIComponent(String(ticketId))}`)
        } else {
          router.push('/purchase/success')
        }
      } else if (data.status === 'failed') {
        const reason = data.reason ? encodeURIComponent(String(data.reason)) : 'unknown'
        router.push(`/purchase/failed?reason=${reason}`)
      }

      router.refresh()
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [router])

  // If the user closes the MonCash popup manually, remove blurred backdrop.
  useEffect(() => {
    if (!isMonCashPopupOpen) return
    const id = window.setInterval(() => {
      const popup = moncashPopupRef.current
      if (popup && popup.closed) {
        moncashPopupRef.current = null
        setIsMonCashPopupOpen(false)
      }
    }, 500)

    return () => window.clearInterval(id)
  }, [isMonCashPopupOpen])

  async function handleClaimFreeTicket() {
    setLoading(true)
    setError(null)

    try {
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 800))
        showToast({
          type: 'success',
          title: 'Free ticket claimed!',
          message: `${quantity} ticket${quantity !== 1 ? 's' : ''} added to your collection`,
          duration: 4000
        })
        router.push('/tickets')
        return
      }

      console.log('Claiming free tickets for event:', eventId, 'Quantity:', quantity)
      
      const response = await fetch('/api/tickets/claim-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, quantity }),
      })

      const data = await response.json()
      
      console.log('Claim response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim ticket')
      }

      // Show success toast and redirect
      showToast({
        type: 'success',
        title: 'Tickets claimed successfully!',
        message: `${data.count} free ticket${data.count !== 1 ? 's' : ''} added to your collection`,
        duration: 4000
      })
      
      router.push('/tickets')
      router.refresh()
    } catch (err: any) {
      console.error('Claim error:', err)
      setError(err.message || 'Failed to claim ticket')
      showToast({
        type: 'error',
        title: 'Failed to claim ticket',
        message: err.message || 'Please try again later',
        duration: 4000
      })
      setLoading(false)
    }
  }

  async function handlePurchase(method: 'stripe' | 'moncash' | 'natcash' | 'sogepay') {
    setLoading(true)
    setError(null)

    try {
      // In demo mode, just show success message
      if (isDemoMode()) {
        await new Promise(resolve => setTimeout(resolve, 800))
        setShowModal(false)
        setShowTieredModal(false)
        showToast({
          type: 'success',
          title: 'Tickets purchased!',
          message: `${quantity} ticket${quantity !== 1 ? 's' : ''} successfully purchased`,
          duration: 4000
        })
        router.refresh()
        setLoading(false)
        return
      }

      if (method === 'stripe') {
        if (isHaitiEvent) {
          throw new Error('Card payments for Haiti events use Sogepay.')
        }
        // Use embedded payment instead of redirect
        setShowModal(false)
        setShowEmbeddedPayment(true)
        setLoading(false)
      } else if (method === 'sogepay') {
        if (!isHaitiEvent) {
          throw new Error('Sogepay is only available for Haiti events.')
        }

        setShowModal(false)

        const tiers = selectedTiers.length
          ? selectedTiers.map(t => ({ tierId: t.tierId, quantity: t.quantity }))
          : undefined

        const response = await fetch('/api/sogepay/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            quantity,
            tierId: selectedTierId,
            promoCode,
            tiers,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate Sogepay payment')
        }

        if (!data.redirectUrl) {
          throw new Error('Missing Sogepay redirect URL')
        }

        const popupWidth = 480
        const popupHeight = 720
        const dualScreenLeft = (window as any).screenLeft ?? window.screenX ?? 0
        const dualScreenTop = (window as any).screenTop ?? window.screenY ?? 0
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screen.width
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || screen.height
        const left = Math.max(0, Math.floor(dualScreenLeft + (viewportWidth - popupWidth) / 2))
        const top = Math.max(0, Math.floor(dualScreenTop + (viewportHeight - popupHeight) / 2))

        const popup = window.open(
          data.redirectUrl,
          'sogepay_checkout',
          `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
        )

        if (!popup) {
          setIsMonCashPopupOpen(false)
          moncashPopupRef.current = null
          window.location.href = data.redirectUrl
          return
        }

        popup.focus()
        moncashPopupRef.current = popup
        setIsMonCashPopupOpen(true)

        showToast({
          type: 'info',
          title: 'Complete payment in the popup',
          message: 'Keep this tab open. We’ll bring you back when payment completes.',
          duration: 6000,
        })

        setLoading(false)
      } else {
        // MonCash Button checkout (hosted redirect)
        if (!isHaitiEvent) {
          throw new Error('MonCash is only available for Haiti events.')
        }
        setShowModal(false)

        const tiers = selectedTiers.length
          ? selectedTiers.map(t => ({ tierId: t.tierId, quantity: t.quantity }))
          : undefined

        const response = await fetch('/api/moncash-button/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            quantity,
            tierId: selectedTierId,
            promoCode,
            tiers,
            mobileMoneyProvider: method,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate MonCash Button payment')
        }

        if (!data.redirectUrl) {
          throw new Error('Missing MonCash redirect URL')
        }

        const popupWidth = 480
        const popupHeight = 720
        const dualScreenLeft = (window as any).screenLeft ?? window.screenX ?? 0
        const dualScreenTop = (window as any).screenTop ?? window.screenY ?? 0
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screen.width
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || screen.height
        const left = Math.max(0, Math.floor(dualScreenLeft + (viewportWidth - popupWidth) / 2))
        const top = Math.max(0, Math.floor(dualScreenTop + (viewportHeight - popupHeight) / 2))

        const popup = window.open(
          data.redirectUrl,
          'moncash_checkout',
          `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
        )

        if (!popup) {
          // Popup blocked: fallback to same-tab redirect.
          setIsMonCashPopupOpen(false)
          moncashPopupRef.current = null
          window.location.href = data.redirectUrl
          return
        }

        popup.focus()

        // Blur the opener background while the popup is open.
        moncashPopupRef.current = popup
        setIsMonCashPopupOpen(true)

        showToast({
          type: 'info',
          title: 'Complete payment in the popup',
          message: 'Keep this tab open. We’ll bring you back when payment completes.',
          duration: 6000,
        })

        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to purchase ticket')
      showToast({
        type: 'error',
        title: 'Purchase failed',
        message: err.message || 'Please try again later',
        duration: 4000
      })
      setLoading(false)
    }
  }

  const handleTieredPurchase = (
    selections: { tierId: string; quantity: number; price: number; tierName?: string }[],
    promoCodeId?: string
  ) => {
    if (!selections || selections.length === 0) return

    const totalQuantity = selections.reduce((sum, s) => sum + s.quantity, 0)
    const totalPrice = selections.reduce((sum, s) => sum + (s.price * s.quantity), 0)

    // Store all selections for multi-tier support
    setSelectedTiers(selections)

    // Persist promo code (id) so payment APIs can apply the discount.
    setPromoCode(promoCodeId)
    
    // For backward compatibility, also set the first tier
    const firstSelection = selections[0]
    setSelectedTierId(firstSelection.tierId)
    setSelectedTierPrice(totalPrice / totalQuantity) // Average price (for display compatibility)
    setQuantity(totalQuantity)
    
    setShowTieredModal(false)
    setShowModal(true)
  }

  return (
    <>
      {isMonCashPopupOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}
      {isFree ? (
        <div className="space-y-4">
          {/* Quantity Selector for Free Tickets */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <span className="text-sm font-medium text-gray-700">{t('quantity')}</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || loading}
                className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10 || loading}
                className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <button
            onClick={handleClaimFreeTicket}
            disabled={loading}
            className="block w-full bg-teal-700 hover:bg-teal-800 text-white text-center font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? t('events.processing') : `${t('events.claim')} ${quantity} ${t('events.free_ticket')}${quantity !== 1 ? 's' : ''}`}
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={handleOpenPurchaseFlow}
            disabled={loading || tierProbeLoading}
            className="block w-full bg-teal-700 hover:bg-teal-800 text-white text-center font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading || tierProbeLoading ? t('events.processing') : t('events.buy_ticket')}
          </button>

          {/* Tiered Ticket Selection Modal */}
          {showTieredModal && (
            <BottomSheet 
              isOpen={showTieredModal} 
              onClose={() => setShowTieredModal(false)}
              title={t('events.select_tickets')}
            >
              <EventbriteStyleTicketSelector
                eventId={eventId}
                userId={userId}
                currency={currency}
                onPurchase={handleTieredPurchase}
              />
            </BottomSheet>
          )}
        </>
      )}

      {error && !showModal && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showModal && !isFree && (
        <BottomSheet 
          isOpen={showModal} 
          onClose={() => setShowModal(false)}
          title={t('events.choose_payment_method')}
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              {quantity === 1 ? t('events.select_payment_description', { count: quantity }) : t('events.select_payment_description_plural', { count: quantity })}
            </p>

            {/* Quantity Selector - Only show for single tier purchases */}
            {selectedTiers.length === 0 && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <span className="text-sm font-medium text-gray-700">{t('events.quantity')}</span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || loading}
                    className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    disabled={quantity >= 10 || loading}
                    className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-teal-50 rounded-lg p-4">
              {selectedTiers.length > 0 ? (
                // Show itemized breakdown for multi-tier purchases
                <div className="space-y-2">
                  {selectedTiers.map((tier, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {tier.quantity}x {tier.tierName || 'Ticket'}
                      </span>
                      <span className="font-medium text-gray-900">
                        {(tier.price * tier.quantity).toLocaleString()} {currency}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-teal-200 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">{t('events.total_amount')}:</span>
                      <span className="text-xl font-bold text-teal-700">
                        {selectedTiers.reduce((sum, t) => sum + (t.price * t.quantity), 0).toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Single tier or legacy display
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('events.total_amount')}:</span>
                  <span className="text-xl font-bold text-teal-700">
                    {((selectedTierPrice || ticketPrice) * quantity).toLocaleString()} {currency}
                  </span>
                </div>
              )}

              {isHaitiEvent && String(currency || 'HTG').toUpperCase() === 'USD' && (
                <div className="mt-3 text-sm text-gray-600">
                  {usdHtgQuoteLoading && <span>Estimating MonCash total in HTG…</span>}
                  {!usdHtgQuoteLoading && usdHtgQuote && (
                    <div className="space-y-1">
                      <div>
                        Estimated MonCash charge: <span className="font-semibold text-gray-900">{usdHtgQuote.amountHtg.toLocaleString()} HTG</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Rate: {usdHtgQuote.baseRate.toFixed(2)} HTG/USD + {(usdHtgQuote.spreadPercent * 100).toFixed(0)}% spread
                      </div>
                    </div>
                  )}
                  {!usdHtgQuoteLoading && usdHtgQuoteError && (
                    <span className="text-red-700">Unable to estimate HTG total right now.</span>
                  )}
                </div>
              )}

              {promoCode && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ Promo code applied
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {/* Card Option (Stripe for US/CA and others; Sogepay for Haiti) */}
              <button
                onClick={() => handlePurchase(isHaitiEvent ? 'sogepay' : 'stripe')}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-4 border-2 border-gray-200 rounded-lg hover:border-teal-600 hover:bg-teal-50 transition disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{t('events.credit_debit_card')}</div>
                    <div className="text-sm text-gray-500">{isHaitiEvent ? 'Sogepay' : t('events.visa_mastercard_amex')}</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* MonCash Option (Haiti only) */}
              {isHaitiEvent && (
                <>
                  <button
                    onClick={() => handlePurchase('moncash')}
                    disabled={loading}
                    className="w-full flex items-center justify-between px-4 py-4 border-2 border-gray-200 rounded-lg hover:border-teal-600 hover:bg-teal-50 transition disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">MonCash</div>
                        <div className="text-sm text-gray-500">{t('events.mobile_money_haiti')}</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => handlePurchase('natcash')}
                    disabled={loading}
                    className="w-full flex items-center justify-between px-4 py-4 border-2 border-gray-200 rounded-lg hover:border-teal-600 hover:bg-teal-50 transition disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-700" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v12h10V6H7zm2 10h6v2H9v-2zm0-4h6v2H9v-2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">NatCash</div>
                        <div className="text-sm text-gray-500">{t('events.mobile_money_haiti')}</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? t('events.processing') : t('common.cancel')}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Embedded Stripe Payment */}
      {showEmbeddedPayment && (
        <EmbeddedStripePayment
          eventId={eventId}
          eventTitle={eventTitle}
          userId={userId}
          quantity={quantity}
          totalAmount={
            selectedTiers.length > 0
              ? selectedTiers.reduce((sum, t) => sum + (t.price * t.quantity), 0)
              : (selectedTierPrice || ticketPrice) * quantity
          }
          currency={currency}
          tierId={selectedTierId || undefined}
          promoCodeId={promoCode}
          onClose={() => {
            setShowEmbeddedPayment(false)
            // Reset state
            setQuantity(1)
            setSelectedTierId(null)
            setSelectedTierPrice(0)
            setSelectedTiers([])
            setPromoCode(undefined)
          }}
        />
      )}
    </>
  )
}
