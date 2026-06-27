'use client'

import { useState, useEffect, useCallback } from 'react'
import { RecurrenceRule } from '@/lib/recurring-events'

interface EventInstance {
  id: string
  parent_event_id: string
  instance_date: string
  instance_time: string
  status: 'scheduled' | 'cancelled' | 'rescheduled'
  capacity_override?: number
  price_override?: number
  created_at: string
}

interface RecurringEventCalendarProps {
  eventId: string
  eventName: string
  isOrganizer: boolean
  recurrenceRule?: RecurrenceRule
}

export default function RecurringEventCalendar({
  eventId,
  eventName,
  isOrganizer,
  recurrenceRule,
}: RecurringEventCalendarProps) {
  const [instances, setInstances] = useState<EventInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedInstance, setSelectedInstance] = useState<EventInstance | null>(null)

  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get first and last day of selected month
      const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
      const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
      
      const fromDate = firstDay.toISOString().split('T')[0]
      const toDate = lastDay.toISOString().split('T')[0]

      const response = await fetch(
        `/api/recurring-events/instances?eventId=${eventId}&fromDate=${fromDate}&toDate=${toDate}`
      )

      if (response.ok) {
        const data = await response.json()
        setInstances(data.instances || [])
      }
    } catch (error) {
      console.error('Error fetching instances:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId, selectedMonth])

  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  const handleCancelInstance = async (instanceId: string) => {
    if (!confirm('Are you sure you want to cancel this event instance?')) {
      return
    }

    try {
      const response = await fetch('/api/recurring-events/instances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, status: 'cancelled' }),
      })

      if (response.ok) {
        alert('Instance cancelled successfully')
        fetchInstances()
        setSelectedInstance(null)
      } else {
        alert('Failed to cancel instance')
      }
    } catch (error) {
      console.error('Error cancelling instance:', error)
      alert('Error cancelling instance')
    }
  }

  const previousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))
  }

  const monthName = selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Group instances by date
  const instancesByDate = instances.reduce((acc, instance) => {
    const date = instance.instance_date
    if (!acc[date]) acc[date] = []
    acc[date].push(instance)
    return acc
  }, {} as Record<string, EventInstance[]>)

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Event Occurrences</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={previousMonth}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-lg font-medium text-gray-900">{monthName}</span>
          <button
            onClick={nextMonth}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Instances List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading instances...</div>
      ) : instances.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No events scheduled for this month
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((instance) => (
            <div
              key={instance.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                instance.status === 'cancelled'
                  ? 'bg-red-50 border-red-200'
                  : instance.status === 'rescheduled'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-white border-gray-200 hover:border-teal-500'
              }`}
              onClick={() => setSelectedInstance(instance)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {new Date(instance.instance_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    {instance.status === 'cancelled' && (
                      <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                        Cancelled
                      </span>
                    )}
                    {instance.status === 'rescheduled' && (
                      <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded">
                        Rescheduled
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {instance.instance_time}
                    {instance.capacity_override && (
                      <span className="ml-2">• Capacity: {instance.capacity_override}</span>
                    )}
                    {instance.price_override && (
                      <span className="ml-2">• Price: ${instance.price_override}</span>
                    )}
                  </div>
                </div>

                {isOrganizer && instance.status === 'scheduled' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelInstance(instance.id)
                    }}
                    className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instance Details Modal */}
      {selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Event Instance</h4>
              <button
                onClick={() => setSelectedInstance(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Event:</span>
                <p className="text-gray-900">{eventName}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Date:</span>
                <p className="text-gray-900">
                  {new Date(selectedInstance.instance_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Time:</span>
                <p className="text-gray-900">{selectedInstance.instance_time}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <p className="text-gray-900 capitalize">{selectedInstance.status}</p>
              </div>

              {selectedInstance.capacity_override && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Capacity Override:</span>
                  <p className="text-gray-900">{selectedInstance.capacity_override}</p>
                </div>
              )}

              {selectedInstance.price_override && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Price Override:</span>
                  <p className="text-gray-900">${selectedInstance.price_override}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedInstance(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              {isOrganizer && selectedInstance.status === 'scheduled' && (
                <button
                  onClick={() => handleCancelInstance(selectedInstance.id)}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Cancel Instance
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
