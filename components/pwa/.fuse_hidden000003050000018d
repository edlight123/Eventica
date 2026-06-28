"use client"
import { useState, useEffect } from 'react'
import { subscribeToPush, sendTestNotification, unsubscribePush } from '@/lib/push'

const AVAILABLE_TOPICS = [
  { key: 'reminders', label: 'Reminders' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'updates', label: 'Platform Updates' }
]

export default function EnableNotificationsButton() {
  const [status, setStatus] = useState<'idle'|'subscribed'|'error'|'denied'>('idle')
  const [loading, setLoading] = useState(false)
  const [topics, setTopics] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('eh_push_topics') || '[]') } catch { return [] }
  })
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => reg.pushManager.getSubscription())
        .then(sub => {
          if (sub) {
            setStatus('subscribed')
            setEndpoint(sub.endpoint)
          }
        })
        .catch(() => {})
    }
  }, [])

  // Fetch session user id (best-effort)
  useEffect(() => {
    let active = true
    fetch('/api/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!active || !data) return
        const id = data?.user?.id || data?.user?.userId || data?.id || null
        if (typeof id === 'string') setUserId(id)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('eh_push_topics', JSON.stringify(topics))
    }
  }, [topics])

  async function onEnable() {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setStatus('error')
      return
    }
    setLoading(true)
    try {
      const sub = await subscribeToPush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, topics, userId || undefined)
      if (!sub) {
        setStatus(Notification.permission === 'denied' ? 'denied' : 'error')
      } else {
        setStatus('subscribed')
        setEndpoint(sub.endpoint)
      }
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  async function onUnsubscribe() {
    if (!endpoint) return
    setLoading(true)
    try {
      await unsubscribePush(endpoint)
      setStatus('idle')
      setEndpoint(null)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function toggleTopic(key: string) {
    setTopics(t => t.includes(key) ? t.filter(x => x !== key) : [...t, key])
  }

  async function sendTest() {
    setLoading(true)
    await sendTestNotification()
    setLoading(false)
  }

  let label = 'Enable Notifications'
  if (status === 'subscribed') label = 'Notifications Enabled'
  if (status === 'denied') label = 'Permission Denied'
  if (status === 'error') label = 'Error Enabling'

  return (
    <div className="fixed right-4 bottom-20 z-40 flex flex-col items-end gap-2 w-64">
      {status !== 'subscribed' && (
        <div className="bg-white/90 backdrop-blur rounded-lg border shadow p-3 w-full space-y-2">
          <p className="text-xs font-medium text-gray-700">Select Topics</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TOPICS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleTopic(t.key)}
                  className={`px-2 py-1 rounded text-xs border ${topics.includes(t.key) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white'}`}
                >{t.label}</button>
              ))}
            </div>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onEnable}
          disabled={loading || status === 'subscribed'}
          className="h-11 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium shadow disabled:opacity-60"
        >{loading ? 'Working…' : label}</button>
        {status === 'subscribed' && (
          <button
            onClick={onUnsubscribe}
            disabled={loading}
            className="h-11 px-3 rounded-lg bg-white border text-xs shadow"
          >{loading ? '…' : 'Unsub'}</button>
        )}
      </div>
      {status === 'subscribed' && (
        <button
          onClick={sendTest}
          disabled={loading}
          className="h-10 px-3 rounded-lg border text-xs bg-white shadow"
        >{loading ? 'Sending…' : 'Send Test'}</button>
      )}
    </div>
  )
}
