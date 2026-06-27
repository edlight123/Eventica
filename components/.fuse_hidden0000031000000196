'use client'

import { useState, useEffect, useCallback } from 'react'
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
  sort_order: number
  is_active?: boolean
}

interface TicketTiersManagerProps {
  eventId: string
}

export default function TicketTiersManager({ eventId }: TicketTiersManagerProps) {
  const router = useRouter()
  const [tiers, setTiers] = useState<TicketTier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    salesStart: '',
    salesEnd: '',
  })

  const fetchTiers = useCallback(async () => {
    try {
      console.log('Fetching tiers for event:', eventId)
      const response = await fetch(`/api/ticket-tiers?eventId=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch tiers')
      const data = await response.json()
      console.log('Received tiers data:', data)
      setTiers(data.tiers || [])
    } catch (error) {
      console.error('Error fetching tiers:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchTiers()
  }, [fetchTiers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requestBody = {
        eventId,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price) * 100, // Convert to cents
        quantity: parseInt(formData.quantity),
        salesStart: formData.salesStart || null,
        salesEnd: formData.salesEnd || null,
        sortOrder: tiers.length,
      }
      
      console.log('Creating tier with data:', requestBody)
      
      const response = await fetch('/api/ticket-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      console.log('Create tier response:', result)

      if (!response.ok) throw new Error(result.error || 'Failed to create tier')

      alert('Ticket tier created successfully!')
      setShowForm(false)
      setFormData({ name: '', description: '', price: '', quantity: '', salesStart: '', salesEnd: '' })
      fetchTiers()
      router.refresh()
    } catch (error: any) {
      console.error('Error creating tier:', error)
      alert('Error: ' + error.message)
      alert(error.message || 'Failed to create ticket tier')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this ticket tier?')) return

    try {
      const response = await fetch(`/api/ticket-tiers?tierId=${tierId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete tier')

      alert('Ticket tier deleted successfully!')
      fetchTiers()
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to delete ticket tier')
    }
  }

  if (loading && tiers.length === 0) {
    return <p className="text-gray-600">Loading tiers...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Ticket Tiers</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          {showForm ? 'Cancel' : '+ Add Tier'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tier Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., VIP, General Admission, Early Bird"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (HTG) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="500.00"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Available *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="100"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Special perks, benefits, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Start (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.salesStart}
                onChange={(e) => setFormData({ ...formData, salesStart: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales End (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.salesEnd}
                onChange={(e) => setFormData({ ...formData, salesEnd: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300"
          >
            {loading ? 'Creating...' : 'Create Tier'}
          </button>
        </form>
      )}

      {tiers.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No ticket tiers created yet. Click &quot;Add Tier&quot; to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                  {tier.description && (
                    <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="font-medium text-teal-600">
                      {tier.price.toFixed(2)} HTG
                    </span>
                    <span>
                      {tier.sold_quantity || 0} / {tier.total_quantity} sold
                    </span>
                    {tier.sales_start && (
                      <span>
                        Starts: {new Date(tier.sales_start).toLocaleDateString()}
                      </span>
                    )}
                    {tier.sales_end && (
                      <span>
                        Ends: {new Date(tier.sales_end).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(tier.id)}
                  className="ml-4 text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
