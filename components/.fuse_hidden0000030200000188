'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface GroupDiscount {
  id: string
  event_id: string
  min_quantity: number
  discount_percentage: number
  is_active: boolean
  created_at: string
}

interface GroupDiscountsManagerProps {
  eventId: string
}

export default function GroupDiscountsManager({ eventId }: GroupDiscountsManagerProps) {
  const router = useRouter()
  const [discounts, setDiscounts] = useState<GroupDiscount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    minQuantity: '',
    discountPercentage: '',
  })

  const fetchDiscounts = useCallback(async () => {
    try {
      console.log('Fetching group discounts for event:', eventId)
      const response = await fetch(`/api/group-discounts?eventId=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch discounts')
      const data = await response.json()
      console.log('Received group discounts:', data)
      setDiscounts(data.discounts || [])
    } catch (error) {
      console.error('Error fetching group discounts:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchDiscounts()
  }, [fetchDiscounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requestBody = {
        eventId,
        minQuantity: parseInt(formData.minQuantity),
        discountPercentage: parseFloat(formData.discountPercentage),
      }
      
      console.log('Creating group discount with data:', requestBody)
      
      const response = await fetch('/api/group-discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      console.log('Create discount response:', result)

      if (!response.ok) throw new Error(result.error || 'Failed to create group discount')

      alert('Group discount created successfully!')
      setShowForm(false)
      setFormData({ minQuantity: '', discountPercentage: '' })
      fetchDiscounts()
      router.refresh()
    } catch (error: any) {
      console.error('Error creating group discount:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this group discount?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/group-discounts?discountId=${discountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete group discount')

      setDiscounts(discounts.filter(d => d.id !== discountId))
      router.refresh()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && discounts.length === 0) {
    return <p className="text-gray-600">Loading...</p>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Group Discounts</h3>
          <p className="text-sm text-gray-600">Encourage bulk purchases with quantity-based discounts</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
          >
            + Add Discount
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Quantity *
              </label>
              <input
                type="number"
                required
                min="2"
                max="100"
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., 4"
              />
              <p className="text-xs text-gray-500 mt-1">Min tickets to qualify</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount % *
              </label>
              <input
                type="number"
                required
                min="1"
                max="100"
                step="0.01"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">Percentage off</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300"
            >
              {loading ? 'Creating...' : 'Create Discount'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormData({ minQuantity: '', discountPercentage: '' })
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Discounts List */}
      {discounts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">🎟️</p>
          <p>No group discounts created yet. Click &quot;Add Discount&quot; to create one.</p>
          <p className="text-sm mt-2">Example: Buy 4+ tickets, get 10% off</p>
        </div>
      ) : (
        <div className="space-y-3">
          {discounts
            .sort((a, b) => a.min_quantity - b.min_quantity)
            .map((discount) => (
              <div
                key={discount.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      Buy {discount.min_quantity}+ tickets
                    </span>
                    <span className="text-teal-600 font-semibold">
                      → {discount.discount_percentage}% OFF
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Customers save {discount.discount_percentage}% when buying {discount.min_quantity} or more tickets
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(discount.id)}
                  disabled={loading}
                  className="ml-4 text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
