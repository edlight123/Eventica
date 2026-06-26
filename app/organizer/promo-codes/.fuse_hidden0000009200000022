'use client'

import { useState } from 'react'
import { EmptyState, StatusChip, type ChipTone } from '@/components/ui/kit'
import { DataTable, type Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Ticket, Plus, Trash2 } from 'lucide-react'

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

  const getPromoStatus = (promo: PromoCode): { label: string; tone: ChipTone } => {
    if (!promo.is_active) return { label: 'Disabled', tone: 'neutral' }
    const expired = promo.expires_at ? new Date(promo.expires_at).getTime() < Date.now() : false
    if (expired) return { label: 'Expired', tone: 'danger' }
    return { label: 'Active', tone: 'success' }
  }

  const actionButtons = (promo: PromoCode) => (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => toggleActive(promo.id, promo.is_active)}
        className={`px-3 py-1.5 rounded-lg font-medium text-xs md:text-sm transition ${
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
        aria-label="Delete promo code"
      >
        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
      </button>
    </div>
  )

  const columns: Column<PromoCode>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      sortAccessor: (p) => p.code,
      render: (p) => (
        <div className="min-w-0">
          <div className="font-mono font-bold tracking-tight text-gray-900">{p.code}</div>
          <div className="text-xs text-gray-500 truncate">{p.event?.title || 'Event not found'}</div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (p) =>
        p.discount_type === 'percentage' ? `${p.discount_value}% off` : `$${p.discount_value} off`,
    },
    {
      key: 'usage',
      header: 'Usage',
      sortable: true,
      sortAccessor: (p) => p.uses_count,
      render: (p) => (
        <span className="text-gray-700">
          {p.uses_count}
          {p.max_uses ? ` / ${p.max_uses}` : ''}
        </span>
      ),
    },
    {
      key: 'expires',
      header: 'Expires',
      hideOnMobile: true,
      sortable: true,
      sortAccessor: (p) => (p.expires_at ? new Date(p.expires_at).getTime() : 0),
      render: (p) => (p.expires_at ? new Date(p.expires_at).toLocaleDateString() : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const s = getPromoStatus(p)
        return <StatusChip tone={s.tone}>{s.label}</StatusChip>
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => actionButtons(p),
    },
  ]

  const renderMobileCard = (p: PromoCode) => {
    const s = getPromoStatus(p)
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-lg font-bold tracking-tight text-gray-900">{p.code}</span>
          <StatusChip tone={s.tone}>{s.label}</StatusChip>
        </div>
        <p className="text-sm text-gray-600 truncate">{p.event?.title || 'Event not found'}</p>
        <p className="text-sm text-gray-700">
          {p.discount_type === 'percentage' ? `${p.discount_value}% off` : `$${p.discount_value} off`}
          <span className="text-gray-400"> · </span>
          Used {p.uses_count}
          {p.max_uses ? ` / ${p.max_uses}` : ''}
        </p>
        {p.expires_at && (
          <p className="text-xs text-gray-500">Expires {new Date(p.expires_at).toLocaleDateString()}</p>
        )}
        <div className="pt-1">{actionButtons(p)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24 relative">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-gray-900">Your promo codes</h2>
        <button
          onClick={() => setShowForm(true)}
          className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-700 text-white font-semibold text-sm hover:bg-brand-800 transition"
        >
          <Plus className="w-4 h-4" />
          Create Promo Code
        </button>
      </div>

      {/* Sticky mobile create button */}
      <div className="fixed bottom-24 right-4 z-40 md:hidden">
        <button
          onClick={() => setShowForm(true)}
          className="shadow-lg inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-700 text-white font-semibold text-sm hover:bg-brand-800 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
      </div>

      {/* Promo Codes Table */}
      <DataTable<PromoCode>
        columns={columns}
        rows={promoCodes}
        rowKey={(p) => p.id}
        pageSize={10}
        renderMobileCard={renderMobileCard}
        empty={
          <EmptyState
            icon={Ticket}
            title="No promo codes yet"
            description="Create one to get started!"
            className="border-0"
          />
        }
      />

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="lg" showCloseButton>
        <form onSubmit={handleCreate}>
          <h3 className="font-display text-2xl text-gray-900 mb-4">New promo code</h3>

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

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-brand-700 text-white font-semibold text-sm hover:bg-brand-800 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Code'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
