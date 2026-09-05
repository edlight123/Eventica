'use client'

import { useState } from 'react'

export default function SeedEventsClient() {
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    events?: Array<{ id: string; title: string; location: string; date: string; price: string; currency: string }>
  } | null>(null)

  const [verifyResult, setVerifyResult] = useState<any>(null)

  const handleSeedEvents = async () => {
    if (!confirm('This will create 30 template events. Continue?')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/seed-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        const details = data?.details ? `\n${JSON.stringify(data.details)}` : ''
        throw new Error(`${data.error || 'Failed to seed events'}${details}`)
      }

      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to seed events',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const response = await fetch('/api/admin/seed-events/verify', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        const details = data?.details ? `\n${JSON.stringify(data.details)}` : ''
        throw new Error(`${data.error || 'Failed to verify'}${details}`)
      }
      setVerifyResult(data)
    } catch (error) {
      setVerifyResult({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to verify',
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white/[0.03] dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl mb-2">Seed Template Events</h1>
          <p className="text-white/60 dark:text-white/50">
            Create 30 template events across Haiti, USA, and Canada under the info@edlight.org organizer account.
          </p>
        </div>

        <div className="mb-6 grid gap-3">
          <div className="rounded-lg border p-3 text-sm bg-white/[0.03]">
            <div className="font-semibold mb-1">Quick diagnostics</div>
            <div className="text-white/70">
              Demo mode (client build): <span className="font-mono">{String(process.env.NEXT_PUBLIC_DEMO_MODE)}</span>
            </div>
            <div className="text-white/70">
              Firebase project (client):{' '}
              <span className="font-mono">{String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)}</span>
            </div>
            <div className="text-white/50 mt-1">
              If demo mode is <span className="font-mono">true</span>, Discover/Home will show demo events instead of Firestore.
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full bg-gray-900 hover:bg-black disabled:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {verifying ? 'Verifying…' : 'Verify seeded events visibility'}
          </button>

          {verifyResult && (
            <div
              className={`p-4 rounded-lg ${verifyResult.ok ? 'border border-emerald-500/30' : 'border border-red-500/30'}`}
            >
              <div className="font-semibold mb-2">{verifyResult.ok ? 'Verify OK' : 'Verify failed'}</div>
              <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(verifyResult, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">What will be created:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-white/60 dark:text-white/50">
              <li>15 events in Haiti (50%) - Mix of USD and HTG pricing</li>
              <li>8 events in USA (Miami, New York, Boston, etc.)</li>
              <li>7 events in Canada (Montreal, Toronto, Vancouver, etc.)</li>
              <li>Categories: Music, Festival, Cultural, Food, Art, Conference, Workshop</li>
              <li>Multiple ticket tiers: Early Bird (30% off, expires 14 days before), General, VIP</li>
              <li>Haiti events: HTG 1,000-4,500 or USD $20-$100</li>
              <li>Event dates: 30-90 days in the future</li>
            </ul>
          </div>

          <button
            onClick={handleSeedEvents}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Creating Events...' : 'Create 30 Template Events'}
          </button>

          {result && (
            <div
              className={`p-4 rounded-lg ${result.success ? 'border border-emerald-500/30' : 'border border-red-500/30'}`}
            >
              <p className="font-semibold mb-2">{result.message}</p>
              {result.events && result.events.length > 0 && (
                <div className="mt-4 max-h-96 overflow-y-auto">
                  <p className="text-sm mb-2">Created events:</p>
                  <div className="space-y-2">
                    {result.events.map((event, idx) => (
                      <div key={event.id} className="text-xs bg-white/[0.03] p-2 rounded border">
                        <div className="font-medium">
                          {idx + 1}. {event.title}
                        </div>
                        <div className="text-white/60">
                          {event.location} • {new Date(event.date).toLocaleDateString()} • {event.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {result?.success && (
            <div className="flex gap-2">
              <button
                className="flex-1 bg-white/[0.03] hover:bg-white/[0.04] text-white/90 font-semibold py-2 px-4 rounded-lg transition-colors"
                onClick={() => (window.location.href = '/discover')}
              >
                View Events
              </button>
              <button
                className="flex-1 bg-white/[0.03] hover:bg-white/[0.04] text-white/90 font-semibold py-2 px-4 rounded-lg transition-colors"
                onClick={() => (window.location.href = '/organizer/events')}
              >
                Manage Events
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
