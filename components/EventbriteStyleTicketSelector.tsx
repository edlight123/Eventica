'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import { allSelectionsFree, computeSelectionTotal, isFreeTier } from '@/lib/ticketPricing'

interface TicketTier {
  id: string
  name: string
  description: string | null
  price: number
  total_quantity: number
  sold_quantity: number
  sales_start: string | null
  sales_end: string | null
  is_active?: boolean
}

interface TierQuantity {
  [tierId: string]: number
}

interface PromoCodeValidation {
  valid: boolean
  promoCode?: {
    id: string
    code: string
    description: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
  }
}

interface EventbriteStyleTicketSelectorProps {
  eventId: string
  userId: string | null
  currency?: string
  /**
   * `discountedTotal` is what THIS component computed after applying the promo —
   * a routing hint only (it decides whether to try the free-claim endpoint). The
   * server re-prices the order from Firestore and has the final say.
   */
  onPurchase: (
    selections: { tierId: string; quantity: number; price: number; tierName?: string }[],
    promoCodeId?: string,
    discountedTotal?: number
  ) => void
}

export default function EventbriteStyleTicketSelector({ 
  eventId, 
  userId, 
  currency = 'HTG',
  onPurchase 
}: EventbriteStyleTicketSelectorProps) {
  const { t } = useTranslation('common')
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const [quantities, setQuantities] = useState<TierQuantity>({})
  const [loading, setLoading] = useState(true)
  const [promoCode, setPromoCode] = useState('')
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)

  const fetchTiers = useCallback(async () => {
    try {
      const response = await fetch(`/api/ticket-tiers?eventId=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch tiers')
      const data = await response.json()
      setTiers(data.tiers || [])
      
      // Initialize quantities to 0
      const initialQuantities: TierQuantity = {}
      data.tiers?.forEach((tier: TicketTier) => {
        initialQuantities[tier.id] = 0
      })
      setQuantities(initialQuantities)
    } catch (error) {
      console.error('Error fetching tiers:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchTiers()
  }, [fetchTiers])

  const isTierAvailable = (tier: TicketTier): boolean => {
    const now = new Date()

    if (tier.is_active === false) {
      return false
    }
    
    if (tier.sales_start && new Date(tier.sales_start) > now) {
      return false
    }
    
    if (tier.sales_end && new Date(tier.sales_end) < now) {
      return false
    }
    
    return (tier.total_quantity - (tier.sold_quantity || 0)) > 0
  }

  const getAvailableQuantity = (tier: TicketTier): number => {
    return tier.total_quantity - (tier.sold_quantity || 0)
  }

  const updateQuantity = (tierId: string, delta: number) => {
    const tier = tiers.find(t => t.id === tierId)
    if (!tier) return

    const maxAvailable = getAvailableQuantity(tier)
    const newQuantity = Math.max(0, Math.min(maxAvailable, (quantities[tierId] || 0) + delta))
    
    setQuantities(prev => ({
      ...prev,
      [tierId]: newQuantity
    }))
  }

  const getTotalTickets = (): number => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  }

  /** The tiers the buyer has actually put in the cart, with unit price and quantity. */
  const getSelections = () =>
    tiers
      .filter((tier) => (quantities[tier.id] || 0) > 0)
      .map((tier) => ({
        tierId: tier.id,
        quantity: quantities[tier.id],
        price: tier.price,
        tierName: tier.name,
      }))

  // Money math runs on integer cents inside computeSelectionTotal, so 3 × 10.10 is
  // exactly 30.30 and a percentage promo can't leave binary-float dust behind.
  const getTotalPrice = (): number => {
    const discount = promoValidation?.valid && promoValidation.promoCode
      ? promoValidation.promoCode.discountType === 'percentage'
        ? { percentage: promoValidation.promoCode.discountValue }
        : { amount: promoValidation.promoCode.discountValue }
      : null

    return computeSelectionTotal(getSelections(), discount)
  }

  /** Format a unit/line amount, showing a genuine zero as "Free" rather than "0.00 HTG". */
  const formatMoney = (amount: number): string =>
    amount === 0 ? t('common.free') : `${amount.toFixed(2)} ${currency}`

  const validatePromoCode = async () => {
    if (!promoCode.trim() || !userId) return

    setValidatingPromo(true)
    setPromoError(null)
    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, eventId }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setPromoValidation(data)
        setPromoError(null)
      } else {
        setPromoError(data.error || 'Invalid promo code')
        setPromoValidation(null)
      }
    } catch (error) {
      console.error('Error validating promo:', error)
      setPromoError('Failed to validate promo code')
    } finally {
      setValidatingPromo(false)
    }
  }

  const handlePurchase = () => {
    if (!userId) return

    const selections = getSelections()

    if (selections.length === 0) return

    onPurchase(selections, promoValidation?.promoCode?.id, getTotalPrice())
  }

  if (loading) {
    return <p className="text-white/65">{t('events.loading_ticket_options')}</p>
  }

  if (tiers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/65 mb-4">{t('events.no_ticket_tiers')}</p>
        <p className="text-sm text-white/70">{t('events.no_ticket_tiers_desc')}</p>
      </div>
    )
  }

  const totalTickets = getTotalTickets()
  const totalPrice = getTotalPrice()
  // Free ISSUANCE is decided by each selected tier's OWN price, not by the total.
  // A cart zeroed by a 100%-off promo still has to go through checkout — the
  // free-claim endpoint requires the tier itself to cost 0 and would refuse it.
  const isFreeOrder = allSelectionsFree(getSelections())

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{t('events.select_tickets')}</h3>

      {/* Tier List with Quantity Selectors */}
      <div className="space-y-3">
        {tiers.map((tier) => {
          const available = getAvailableQuantity(tier)
          const isAvailable = isTierAvailable(tier)
          const quantity = quantities[tier.id] || 0

          return (
            <div
              key={tier.id}
              className={`border rounded-lg p-4 transition-all ${
                quantity > 0
                  ? 'border-brand-500 '
                  : isAvailable
                  ? 'border-white/10 hover:border-white/20'
                  : 'border-white/10 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Tier Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white">{tier.name}</h4>
                  {tier.description && (
                    <p className="text-sm text-white/65 mt-1">{tier.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="font-medium text-brand-400">
                      {isFreeTier(tier) ? t('common.free') : `${tier.price.toFixed(2)} ${currency}`}
                    </span>
                    <span className={available > 0 ? 'text-white/65' : 'text-red-400'}>
                      {available > 0 ? `${available} ${t('ticket.available')}` : t('ticket.sold_out')}
                    </span>
                  </div>
                  {!isAvailable && available > 0 && (
                    <p className="text-xs text-amber-400 mt-1">
                      {tier.sales_start && new Date(tier.sales_start) > new Date()
                        ? `${t('events.sales_start')} ${new Date(tier.sales_start).toLocaleDateString()}`
                        : `${t('events.sales_ended')} ${new Date(tier.sales_end!).toLocaleDateString()}`}
                    </p>
                  )}
                </div>

                {/* Quantity Selector */}
                {isAvailable && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(tier.id, -1)}
                      disabled={quantity === 0}
                      aria-label={`${t('events.decrease_quantity', { defaultValue: 'Decrease quantity' })} — ${tier.name}`}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-white/10 hover:border-brand-500 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <Minus className="w-4 h-4 text-white/65" />
                    </button>
                    <span className="w-12 text-center font-semibold text-white text-lg">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(tier.id, 1)}
                      disabled={quantity >= available}
                      aria-label={`${t('events.increase_quantity', { defaultValue: 'Increase quantity' })} — ${tier.name}`}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-white/10 hover:border-brand-500 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <Plus className="w-4 h-4 text-white/65" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Promo Code Section */}
      <div className="border border-white/10 rounded-lg p-4">
        <label htmlFor="promo-code" className="block font-medium text-white mb-3">{t('events.promo_code_optional')}</label>
        <div className="flex gap-2">
          <input
            id="promo-code"
            type="text"
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null) }}
            placeholder={t('events.enter_code')}
            disabled={!userId || validatingPromo}
            className="flex-1 px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-white/[0.04]"
          />
          <button
            onClick={validatePromoCode}
            disabled={!userId || !promoCode.trim() || validatingPromo}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed min-w-[80px]"
          >
            {validatingPromo ? '...' : t('events.apply')}
          </button>
        </div>
        {promoError && (
          <div className="mt-2 text-sm text-red-300" role="alert">
            {promoError}
          </div>
        )}
        {promoValidation?.valid && (
          <div className="mt-2 text-sm text-green-400 flex items-center gap-1">
            <span>✓</span>
            <span>{promoValidation.promoCode?.description || 'Promo code applied'}</span>
          </div>
        )}
      </div>

      {/* Total Summary */}
      {totalTickets > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
          <div className="space-y-2">
            {tiers
              .filter(tier => quantities[tier.id] > 0)
              .map(tier => (
                <div key={tier.id} className="flex justify-between text-sm">
                  <span className="text-white/65">
                    {quantities[tier.id]}× {tier.name}
                  </span>
                  <span className="text-white">
                    {formatMoney(
                      computeSelectionTotal([{ price: tier.price, quantity: quantities[tier.id] }])
                    )}
                  </span>
                </div>
              ))}
            {promoValidation?.valid && promoValidation.promoCode && (
              <div className="flex justify-between text-sm text-green-400">
                <span>
                  {t('common.promo_discount')} ({promoValidation.promoCode.code})
                </span>
                <span>
                  -{promoValidation.promoCode.discountType === 'percentage' 
                    ? `${promoValidation.promoCode.discountValue}%` 
                    : `${promoValidation.promoCode.discountValue.toFixed(2)} ${currency}`}
                </span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-lg">
              <span>{t('events.total')} ({totalTickets} {t('ticket.ticket')}{totalTickets !== 1 ? 's' : ''})</span>
              <span className="text-brand-400">{formatMoney(totalPrice)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={!userId || totalTickets === 0}
        className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
      >
        {!userId
          ? t('events.sign_in_to_purchase')
          : totalTickets === 0
          ? t('events.select_tickets')
          : isFreeOrder
          ? totalTickets === 1
            ? t('events.get_free_ticket', { defaultValue: 'Get free ticket' })
            : t('events.get_free_tickets', { defaultValue: 'Get free tickets' })
          : `${t('events.checkout')} - ${formatMoney(totalPrice)}`
        }
      </button>
    </div>
  )
}
