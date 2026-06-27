'use client'

import { useState } from 'react'

interface EventUpdatesProps {
  eventId: string
  eventTitle: string
}

export default function EventUpdates({ eventId, eventTitle }: EventUpdatesProps) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [title, setTitle] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendSms, setSendSms] = useState(false)

  async function handleSendUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/events/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          title,
          message: updateMessage,
          sendEmail,
          sendSms,
          sendNow: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send update')
      }

      setMessage({ 
        type: 'success', 
        text: `✓ Update sent to ${data.stats?.emailsSent || 0} attendees!` 
      })
      
      setTitle('')
      setUpdateMessage('')
      
      setTimeout(() => {
        setShowModal(false)
        setMessage(null)
      }, 3000)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        className="w-full px-4 py-3 bg-brand-700 text-white font-semibold rounded-lg hover:bg-brand-800 transition"
      >
        📢 Send Update to Attendees
      </button>

      {/* Send Update Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-2xl text-white mb-2">Send Event Update</h2>
            <p className="text-white/60 mb-6">
              Notify all ticket holders about {eventTitle}
            </p>

            <form onSubmit={handleSendUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Update Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Important venue change"
                  className="w-full px-4 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Message
                </label>
                <textarea
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="Write your announcement here..."
                  className="w-full px-4 py-2 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  rows={6}
                  required
                  maxLength={2000}
                />
                <p className="text-xs text-white/50 mt-1">
                  {updateMessage.length}/2000 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 text-brand-300 border-white/15 rounded focus:ring-brand-500"
                  />
                  <span className="ml-2 text-sm text-white/70">
                    📧 Send via Email
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="w-4 h-4 text-brand-300 border-white/15 rounded focus:ring-brand-500"
                  />
                  <span className="ml-2 text-sm text-white/70">
                    📱 Send via SMS (for attendees with phone numbers)
                  </span>
                </label>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'border border-emerald-500/30 text-emerald-300'
                    : 'border border-red-500/30 text-red-300'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm text-amber-300">
                  ⚠️ This will immediately send notifications to all active ticket holders.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-white/15 rounded-lg text-white/70 font-medium hover:bg-[#0a0a0a]"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-brand-700 text-white font-semibold rounded-lg hover:bg-brand-800 disabled:opacity-50"
                  disabled={loading || !title || !updateMessage || (!sendEmail && !sendSms)}
                >
                  {loading ? 'Sending...' : 'Send Update Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
