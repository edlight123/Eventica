
'use client'

import { useEffect, useMemo } from 'react'
import { EventFormData, TabValidation, TicketTier } from '@/lib/event-validation'
import { AlertCircle, CheckCircle, DollarSign, Ticket, Plus, Trash2 } from 'lucide-react'
import { getAllowedEventCurrencies, normalizeEventCurrencyForCountry } from '@/lib/currency-policy'

interface TicketsTabProps {
  formData: EventFormData
  onChange: (field: keyof EventFormData, value: any) => void
  tiers: TicketTier[]
  onTiersChange: (tiers: TicketTier[]) => void
  validation: TabValidation
}

export function TicketsTab({ formData, onChange, tiers, onTiersChange, validation }: TicketsTabProps) {
  const priceError = validation.missingFields.find(f => f.toLowerCase().includes('price'))
  const quantityError = validation.missingFields.find(f => f.toLowerCase().includes('quantity') || f.toLowerCase().includes('tier'))

  const allowedCurrencies = useMemo(() => {
    return getAllowedEventCurrencies(formData.country)
  }, [formData.country])

  const enforcedCurrency = useMemo(() => {
    return normalizeEventCurrencyForCountry(formData.country, formData.currency)
  }, [formData.country, formData.currency])

  useEffect(() => {
    if (String(formData.currency || '').trim().toUpperCase() !== enforcedCurrency) {
      onChange('currency', enforcedCurrency)
    }
  }, [enforcedCurrency, formData.currency, onChange])

  const toDateTimeLocalValue = (iso: string | undefined) => {
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const tzOffsetMs = date.getTimezoneOffset() * 60_000
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16)
  }

  const addTier = () => {
    onTiersChange([...tiers, { name: '', price: '', quantity: '', description: '', salesStart: '', salesEnd: '' }])
  }

  const updateTier = (index: number, field: keyof TicketTier, value: string | number) => {
    const updated = [...tiers]
    updated[index] = { ...updated[index], [field]: value }
    onTiersChange(updated)
  }

  const removeTier = (index: number) => {
    onTiersChange(tiers.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Section Header */}
      <div>
        <h2 className="font-display text-lg text-white mb-2">Ticket Information</h2>
        <p className="text-white/60">Set your pricing and capacity</p>
      </div>

      {/* Currency */}
      <div>
        <label htmlFor="currency" className="block text-sm font-semibold text-white/70 mb-2">
          Currency <span className="text-red-300">*</span>
        </label>
        <select
          id="currency"
          value={enforcedCurrency}
          onChange={(e) => onChange('currency', e.target.value)}
          disabled={allowedCurrencies.length === 1}
          className="w-full px-3 py-2.5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 transition-all"
        >
          {allowedCurrencies.includes('USD') && <option value="USD">USD ($)</option>}
          {allowedCurrencies.includes('CAD') && <option value="CAD">CAD ($)</option>}
          {allowedCurrencies.includes('HTG') && <option value="HTG">HTG (G)</option>}
        </select>
      </div>

      {/* Base Ticket */}
      <div className="border border-brand-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-brand-700 rounded-lg flex items-center justify-center">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">General Admission</h3>
            <p className="text-sm text-white/60">Your main ticket tier</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Price */}
          <div>
            <label htmlFor="ticket_price" className="block text-sm font-semibold text-white/70 mb-2">
              Price <span className="text-red-300">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="number"
                id="ticket_price"
                value={formData.ticket_price}
                onChange={(e) => onChange('ticket_price', e.target.value)}
                min="0"
                step="0.01"
                placeholder="0 for free"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 transition-all ${
                  priceError
                    ? 'border-red-300 focus:border-red-500'
                    : formData.ticket_price !== ''
                    ? 'border-emerald-500/40 focus:border-emerald-500'
                    : 'border-white/10 focus:border-brand-500'
                }`}
              />
            </div>
            {priceError ? (
              <p className="flex items-center gap-1 text-sm text-red-300 font-medium mt-2">
                <AlertCircle className="w-4 h-4" />
                {priceError}
              </p>
            ) : formData.ticket_price === '0' || formData.ticket_price === 0 ? (
              <p className="flex items-center gap-1 text-sm text-emerald-300 font-medium mt-2">
                <CheckCircle className="w-4 h-4" />
                Free event
              </p>
            ) : formData.ticket_price !== '' ? (
              <p className="flex items-center gap-1 text-sm text-emerald-300 font-medium mt-2">
                <CheckCircle className="w-4 h-4" />
                {formData.ticket_price} {formData.currency}
              </p>
            ) : null}
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="total_tickets" className="block text-sm font-semibold text-white/70 mb-2">
              Total Tickets <span className="text-red-300">*</span>
            </label>
            <input
              type="number"
              id="total_tickets"
              value={formData.total_tickets}
              onChange={(e) => onChange('total_tickets', e.target.value)}
              min="1"
              placeholder="e.g., 100"
              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 transition-all ${
                quantityError
                  ? 'border-red-300 focus:border-red-500'
                  : formData.total_tickets
                  ? 'border-emerald-500/40 focus:border-emerald-500'
                  : 'border-white/10 focus:border-brand-500'
              }`}
            />
            {quantityError ? (
              <p className="flex items-center gap-1 text-sm text-red-300 font-medium mt-2">
                <AlertCircle className="w-4 h-4" />
                {quantityError}
              </p>
            ) : formData.total_tickets ? (
              <p className="flex items-center gap-1 text-sm text-emerald-300 font-medium mt-2">
                <CheckCircle className="w-4 h-4" />
                {formData.total_tickets} tickets available
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Premium Tiers */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-brand-300" />
              Premium Ticket Tiers
            </h3>
            <p className="text-sm text-white/60">VIP, Early Bird, or other special options</p>
          </div>
          <button
            type="button"
            onClick={addTier}
            className="flex items-center gap-2 px-4 py-2 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>

        {tiers.length === 0 ? (
          <div className="text-center py-8 text-white/50">
            <p className="text-sm">No premium tiers yet. Click &quot;Add Tier&quot; to create special ticket types.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tiers.map((tier, index) => (
              <div key={index} className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white">Tier #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="flex items-center gap-1 text-red-300 hover:text-red-300 font-medium text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Name <span className="text-red-300">*</span>
                    </label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => updateTier(index, 'name', e.target.value)}
                      placeholder="e.g., VIP"
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Price ({formData.currency}) <span className="text-red-300">*</span>
                    </label>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={(e) => updateTier(index, 'price', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Quantity <span className="text-red-300">*</span>
                    </label>
                    <input
                      type="number"
                      value={tier.quantity}
                      onChange={(e) => updateTier(index, 'quantity', e.target.value)}
                      placeholder="e.g., 50"
                      min="1"
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    Description <span className="text-white/50">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={tier.description || ''}
                    onChange={(e) => updateTier(index, 'description', e.target.value)}
                    placeholder="e.g., Includes backstage access"
                    className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Sales Start <span className="text-white/50">(Optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocalValue(tier.salesStart)}
                      onChange={(e) => updateTier(index, 'salesStart', e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Sales End <span className="text-white/50">(Optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocalValue(tier.salesEnd)}
                      onChange={(e) => updateTier(index, 'salesEnd', e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <div className="border border-amber-500/30 rounded-lg p-4">
          <p className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Suggestions
          </p>
          <ul className="list-disc list-inside space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-amber-300">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-brand-300 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-white mb-1">How Ticket Tiers Work</p>
            <p className="text-sm text-white/60">
              General admission is your base ticket. Add tiers for premium options (VIP with perks at higher price) or promotions (Early Bird at lower price). Each tier sells separately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
