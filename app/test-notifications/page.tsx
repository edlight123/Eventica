'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TestNotificationsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const router = useRouter()

  async function sendTest(type: string) {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/test-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        // Refresh the page to show new notifications
        setTimeout(() => router.push('/notifications'), 1500)
      }
    } catch (error) {
      setResult({ error: 'Failed to send test notification' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#0a0a0a] rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🧪 Test Notifications
          </h1>
          <p className="text-white/65 mb-8">
            Send test notifications to verify the notification system is working correctly.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={() => sendTest('ticket_purchase')}
              disabled={loading}
              className="flex flex-col items-start p-6 hover:bg-brand-100 border-2 border-brand-200 rounded-lg transition disabled:opacity-50"
            >
              <span className="text-2xl mb-2">🎫</span>
              <span className="font-semibold text-white">Ticket Purchase</span>
              <span className="text-sm text-white/65">Test ticket confirmation notification</span>
            </button>

            <button
              onClick={() => sendTest('verification')}
              disabled={loading}
              className="flex flex-col items-start p-6 hover:bg-green-100 border-2 border-green-200 rounded-lg transition disabled:opacity-50"
            >
              <span className="text-2xl mb-2">✅</span>
              <span className="font-semibold text-white">Verification</span>
              <span className="text-sm text-white/65">Test verification approved</span>
            </button>

            <button
              onClick={() => sendTest('event_reminder')}
              disabled={loading}
              className="flex flex-col items-start p-6 bg-[#0a0a0a] hover:bg-white/[0.04] border-2 border-white/10 rounded-lg transition disabled:opacity-50"
            >
              <span className="text-2xl mb-2">⏰</span>
              <span className="font-semibold text-white">Event Reminder</span>
              <span className="text-sm text-white/65">Test event reminder (24h)</span>
            </button>

            <button
              onClick={() => sendTest('new_event')}
              disabled={loading}
              className="flex flex-col items-start p-6 bg-[#0a0a0a] hover:bg-white/[0.04] border-2 border-white/10 rounded-lg transition disabled:opacity-50"
            >
              <span className="text-2xl mb-2">📅</span>
              <span className="font-semibold text-white">New Event</span>
              <span className="text-sm text-white/65">Test follower notification</span>
            </button>

            <button
              onClick={() => sendTest('email')}
              disabled={loading}
              className="flex flex-col items-start p-6 bg-[#0a0a0a] hover:bg-white/[0.04] border-2 border-white/10 rounded-lg transition disabled:opacity-50"
            >
              <span className="text-2xl mb-2">📧</span>
              <span className="font-semibold text-white">Email Test</span>
              <span className="text-sm text-white/65">Send test email</span>
            </button>

            <button
              onClick={() => router.push('/notifications')}
              className="flex flex-col items-start p-6 bg-[#0a0a0a] hover:bg-white/[0.04] border-2 border-white/10 rounded-lg transition"
            >
              <span className="text-2xl mb-2">🔔</span>
              <span className="font-semibold text-white">View Notifications</span>
              <span className="text-sm text-white/65">Go to notifications page</span>
            </button>
          </div>

          {loading && (
            <div className="mt-6 p-4 bg-[#0a0a0a] border border-white/10 rounded-lg">
              <p className="text-white/70">Sending notification...</p>
            </div>
          )}

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'border border-green-200' 
                : 'border border-red-200'
            }`}>
              <p className={result.success ? 'text-emerald-300' : 'text-red-300'}>
                {result.success 
                  ? `✅ Notification sent! Redirecting to notifications page...` 
                  : `❌ Error: ${result.error}`}
              </p>
              {result.sent && (
                <p className="text-sm text-white/65 mt-2">
                  Types sent: {result.sent.join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-[#0a0a0a] rounded-lg border border-white/10">
            <h2 className="font-semibold text-white mb-2">💡 How to Test:</h2>
            <ol className="text-sm text-white/65 space-y-1 list-decimal list-inside">
              <li>Click any notification type above</li>
              <li>You&apos;ll be redirected to /notifications</li>
              <li>Check your notification bell icon</li>
              <li>Check browser push notifications (if enabled)</li>
              <li>Check your email inbox (for email test)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
