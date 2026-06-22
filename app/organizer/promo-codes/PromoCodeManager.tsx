'use client'

import { useState } from 'react'
import { EmptyState } from '@/components/ui/kit'
import { Ticket } from 'lucide-react'

type Event = {
  id: string
  title: string
}

type PromoCode = {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_uses: number | null
  uses_count: number
  event_id: string
  is_active: boolean
  expires_at: string | null
  event: {
    title: string
  } | null
}

export default function PromoCodeManager({
  events,
  promoCodes: initialPromoCodes,
  organizerId,
}: {
  events: Event[]
  promoCodes: PromoCode[]
  organizerId: string
}) {
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [code, setCode] = useState('')
  const [eventId, setEventId] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        eventId,
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        maxUses: maxUses ? parseInt(maxUses) : null,
        validFrom: null,
        validUntil: expiresAt ? new Date(expiresAt).toISOString() : null,
      }

      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to create promo code')

      const eventTitle = events.find((e) => e.id === eventId)?.title || ''
      const created: PromoCode = {
        id: String(json?.promoId || ''),
        code: payload.code,
        discount_type: discountType,
        discount_value: payload.discountValue,
        max_uses: payload.maxUses,
        uses_count: 0,
        event_id: eventId,
        is_active: true,
        expires_at: payload.validUntil,
        event: eventTitle ? { title: eventTitle } : null,
      }

      if (!created.id) throw new Error('Promo ID missing from response')

      setPromoCodes([created, ...promoCodes])
      
      // Reset form
      setCode('')
      setEventId('')
      setDiscountValue('')
      setMaxUses('')
      setExpiresAt('')
      setShowForm(false)
    } catch (error: any) {
      alert(error.message || 'Failed to create promo code')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(promoId: string, isActive: boolean) {
    try {
      const res = await fetch('/api/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoId, isActive: !isActive }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update promo code')

      setPromoCodes(promoCodes.map(p => 
        p.id === promoId ? { ...p, is_active: !isActive } : p
      ))
    } catch (error: any) {
      alert(error.message || 'Failed to update promo code')
    }
  }

  async function deletePromo(promoId: string) {
    if (!confirm('Are you sure you want to delete this promo code?')) return

    try {
      const res = await fetch(`/api/promo-codes?promoId=${encodeURIComponent(promoId)}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to delete promo code')

      setPromoCodes(promoCodes.filter(p => p.id !== promoId))
    } catch (error: any) {
      alert(error.message || 'Failed to delete promo code')
    }
  }

  return (
    <div className="space-y-5 pb-24 relative">
      {/* Create Button (desktop) */}
      <div className="hidden md:flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-lg bg-brand-700 text-white font-semibold text-sm hover:bg-brand-800 transition"
        >
          {showForm ? 'Cancel' : '+ Create Promo Code'}
        </button>
      </div>

      {/* Sticky mobile create button */}
      <div className="fixed bottom-24 right-4 z-40 md:hidden">
        <button
          onClick={() => setShowForm(!showForm)}
          className="shadow-lg px-4 py-2 rounded-full bg-brand-700 text-white font-semibold text-sm hover:bg-brand-800 active:scale-95 transition"
        >
          {showForm ? 'Close' : 'Create'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="relative z-10 bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6"
        >
          <h3 className="font-display text-base md:text-lg text-gray-900 mb-3">New Promo Code</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 uppercase"
                placeholder="SUMMER2024"
              />
            </div>

            <div>
              <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Event
              </label>
              <select
                required
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Discount Value
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500"
                placeholder={discountType === 'percentage' ? '10' : '5.00'}
              />
            </div>

            <div>
              <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Max Uses (optional)
              </label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500"
                placeholder="Unlimited"
              />
            </div>

            <div>
              <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Expires At (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="mt-4 md:mt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-brand-700 text-white font-semibold text-sm hover:bg-brand-800 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Code'}
            </button>
          </div>
        </form>
      )}

      {/* Promo Codes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="font-display text-lg md:text-xl text-gray-900">Active Promo Codes</h2>
        </div>
        
        {promoCodes.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No promo codes yet"
            description="Create one to get started!"
            className="border-0"
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {promoCodes.map(promo => (
              <div key={promo.id} className="p-4 md:p-5 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1.5">
                      <span className="text-lg md:text-xl font-bold text-gray-900 font-mono tracking-tight">{promo.code}</span>
                      {!promo.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] md:text-sm text-gray-600 mb-0.5 truncate">
                      {promo.event?.title || 'Event not found'}
                    </p>
                    <p className="text-[13px] md:text-sm text-gray-600">
                      {promo.discount_type === 'percentage' 
                        ? `${promo.discount_value}% off` 
                        : `$${promo.discount_value} off`}
                    </p>
                    <p className="text-[11px] md:text-xs text-gray-500 mt-1.5">
                      Used {promo.uses_count} {promo.max_uses ? `/ ${promo.max_uses}` : ''} times
                      {promo.expires_at && ` • Expires ${new Date(promo.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleActive(promo.id, promo.is_active)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-[12px] md:text-sm transition ${
                        promo.is_active
                          ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {promo.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deletePromo(promo.id)}
                      className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
