'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'

interface TicketTier {
  id: string
  name: string
  description: string | null
  price: number
  total_quantity: number
  sold_quantity: number
  sales_start: string | null
  sales_end: string | null
}

interface GroupDiscount {
  id: string
  min_quantity: number
  discount_percentage: number
  is_active: boolean
}

interface TieredTicketSelectorProps {
  eventId: string
  userId: string | null
  onPurchase: (tierId: string, tierPrice: number, quantity: number, promoCode?: string) => void
}

export default function TieredTicketSelector({ eventId, userId, onPurchase }: TieredTicketSelectorProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const [groupDiscounts, setGroupDiscounts] = useState<GroupDiscount[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState<any>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')

  const fetchTiers = useCallback(async () => {
    try {
      const response = await fetch(`/api/ticket-tiers?eventId=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch tiers')
      const data = await response.json()
      setTiers(data.tiers || [])
      
      // Auto-select first available tier
      if (data.tiers && data.tiers.length > 0) {
        const firstAvailable = data.tiers.find((t: TicketTier) => 
          (t.total_quantity - (t.sold_quantity || 0)) > 0 && isTierAvailable(t)
        )
        if (firstAvailable) {
          setSelectedTier(firstAvailable.id)
        }
      }
    } catch (error) {
      console.error('Error fetching tiers:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId])
  const fetchGroupDiscounts = useCallback(async () => {
    try {
      const response = await fetch(`/api/group-discounts?eventId=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch group discounts')
      const data = await response.json()
      setGroupDiscounts(data.discounts || [])
    } catch (error) {
      console.error('Error fetching group discounts:', error)
    }
  }, [eventId])

  useEffect(() => {
    fetchTiers()
    fetchGroupDiscounts()
  }, [fetchTiers, fetchGroupDiscounts])

  const isTierAvailable = (tier: TicketTier): boolean => {
    const now = new Date()
    
    if (tier.sales_start && new Date(tier.sales_start) > now) {
      return false
    }
    
    if (tier.sales_end && new Date(tier.sales_end) < now) {
      return false
    }
    
    return (tier.total_quantity - (tier.sold_quantity || 0)) > 0
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return

    setPromoLoading(true)
    setPromoError('')
    setPromoApplied(null)

    try {
      const response = await fetch(`/api/promo-codes?eventId=${eventId}&code=${encodeURIComponent(promoCode.trim())}`)
      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid promo code')
      }

      setPromoApplied(data.promoCode)
    } catch (error: any) {
      setPromoError(error.message || 'Failed to apply promo code')
    } finally {
      setPromoLoading(false)
    }
  }

  const calculateFinalPrice = (): number => {
    const tier = tiers.find(t => t.id === selectedTier)
    if (!tier) return 0

    let price = tier.price

    // Apply promo code discount first
    if (promoApplied) {
      if (promoApplied.discountType === 'percentage') {
        price = price * (1 - promoApplied.discountValue / 100)
      } else if (promoApplied.discountType === 'fixed') {
        price = Math.max(0, price - promoApplied.discountValue)
      }
    }

    // Apply group discount if applicable (after promo)
    const applicableGroupDiscount = getApplicableGroupDiscount()
    if (applicableGroupDiscount && !promoApplied) {
      price = price * (1 - applicableGroupDiscount.discount_percentage / 100)
    }

    return price
  }

  const getApplicableGroupDiscount = (): GroupDiscount | null => {
    if (groupDiscounts.length === 0) return null
    
    // Find the best discount that applies to current quantity
    const applicable = groupDiscounts
      .filter(d => quantity >= d.min_quantity)
      .sort((a, b) => b.discount_percentage - a.discount_percentage)
    
    return applicable.length > 0 ? applicable[0] : null
  }

  const handlePurchase = () => {
    if (!selectedTier || !userId) return

    const finalPrice = calculateFinalPrice()
    onPurchase(selectedTier, finalPrice, quantity, promoApplied?.code)
  }

  if (loading) {
    return <p className="text-white/65">{t('events.loading_ticket_options')}</p>
  }

  if (tiers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/65 mb-4">{t('events.no_ticket_tiers')}</p>
        <p className="text-sm text-white/50">{t('events.no_ticket_tiers_desc')}</p>
      </div>
    )
  }

  const selectedTierData = tiers.find(t => t.id === selectedTier)
  const finalPrice = calculateFinalPrice()
  const totalPrice = finalPrice * quantity

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{t('events.select_ticket_tier')}</h3>

      {/* Tier Selection */}
      <div className="space-y-2">
        {tiers.map((tier) => {
          const available = tier.total_quantity - (tier.sold_quantity || 0)
          const isAvailable = isTierAvailable(tier)
          const isSelected = selectedTier === tier.id

          return (
            <div
              key={tier.id}
              onClick={() => isAvailable && setSelectedTier(tier.id)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-teal-600 '
                  : isAvailable
                  ? 'border-white/10 hover:border-teal-300'
                  : 'border-white/10 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white">{tier.name}</h4>
                    {isSelected && <span className="text-teal-600">✓</span>}
                  </div>
                  {tier.description && (
                    <p className="text-sm text-white/65 mt-1">{tier.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="font-medium text-teal-600">
                      {tier.price.toFixed(2)} HTG
                    </span>
                    <span className={available > 0 ? 'text-white/65' : 'text-red-600'}>
                      {available > 0 ? `${available} ${t('ticket.available')}` : t('ticket.sold_out')}
                    </span>
                  </div>
                  {!isAvailable && available > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {tier.sales_start && new Date(tier.sales_start) > new Date()
                        ? `${t('events.sales_start')} ${new Date(tier.sales_start).toLocaleDateString()}`
                        : `${t('events.sales_ended')} ${new Date(tier.sales_end!).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quantity Selector */}
      {selectedTierData && (
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            {t('events.quantity')}
          </label>
          {groupDiscounts.length > 0 && (
            <div className="mb-3 p-3 border border-brand-200 rounded-lg">
              <p className="text-sm font-medium text-brand-300 mb-1">🎟️ {t('events.group_discounts_available')}:</p>
              <ul className="text-sm text-brand-300 space-y-1">
                {groupDiscounts
                  .sort((a, b) => a.min_quantity - b.min_quantity)
                  .map(d => (
                    <li key={d.id}>
                      {t('events.buy_tickets_save', { count: d.min_quantity, percent: d.discount_percentage })}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            {[...Array(Math.min(10, selectedTierData.total_quantity - (selectedTierData.sold_quantity || 0)))].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Promo Code */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">
          {t('events.promo_code_optional')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase())
              setPromoApplied(null)
              setPromoError('')
            }}
            placeholder={t('events.enter_code')}
            className="flex-1 px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoLoading || !promoCode.trim()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300"
          >
            {promoLoading ? t('events.checking') : t('events.apply')}
          </button>
        </div>
        {promoApplied && (
          <p className="text-sm text-green-600 mt-1">
            ✓ {t('events.promo_code_applied')}: {promoApplied.discountType === 'percentage' 
              ? `${promoApplied.discountValue}% ${t('events.off')}` 
              : `${(promoApplied.discountValue / 100).toFixed(2)} HTG ${t('events.off')}`}
          </p>
        )}
        {promoError && (
          <p className="text-sm text-red-600 mt-1">{promoError}</p>
        )}
      </div>

      {/* Price Summary */}
      {selectedTierData && (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/65">{t('events.tier')}: {selectedTierData.name}</span>
              <span className="text-white">{selectedTierData.price.toFixed(2)} HTG</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{t('events.promo_discount')}</span>
                <span>-{(selectedTierData.price - finalPrice).toFixed(2)} HTG</span>
              </div>
            )}
            {getApplicableGroupDiscount() && !promoApplied && (
              <div className="flex justify-between text-sm text-brand-300">
                <span>{t('events.group_discount')} ({getApplicableGroupDiscount()?.discount_percentage}% {t('events.off')} {getApplicableGroupDiscount()?.min_quantity}+ {t('ticket.tickets')})</span>
                <span>-{(selectedTierData.price - finalPrice).toFixed(2)} HTG</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-white/65">{t('events.quantity')}</span>
              <span className="text-white">× {quantity}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-lg">
              <span>{t('events.total')}</span>
              <span className="text-teal-600">{totalPrice.toFixed(2)} HTG</span>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={!selectedTier || !userId}
        className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {!userId ? t('events.sign_in_to_purchase') : `${t('events.purchase')} ${quantity} ${t('ticket.ticket')}${quantity !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
