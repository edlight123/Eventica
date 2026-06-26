'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { firebaseDb } from '@/lib/firebase-db/client'
import { isDemoMode } from '@/lib/demo'
import { useToast } from '@/components/ui/Toast'
import ImageUpload from '@/components/ImageUpload'
import { normalizeEventCurrencyForCountry } from '@/lib/currency-policy'
import { CalendarDays, Globe, MapPin, Plus, Sparkles } from 'lucide-react'

const CATEGORIES = [
  'Concert',
  'Party',
  'Festival',
  'Conference',
  'Workshop',
  'Sports',
  'Theater',
  'Other',
]

interface QuickCreateEventProps {
  userId: string
  isVerified?: boolean
}

/**
 * Posh-style "quick create": the screen IS the event page, edited inline.
 * A big borderless title, an optional one-line summary, clean When / Where rows,
 * and a tall flyer + Create button on the right. Saves a private draft and hands
 * off to the full editor for tickets / description — so a new organizer gets
 * something real in under a minute, with zero wizard.
 */
export default function QuickCreateEvent({ userId }: QuickCreateEventProps) {
  const router = useRouter()
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [category, setCategory] = useState('Concert')
  const [bannerUrl, setBannerUrl] = useState('')
  const [startDatetime, setStartDatetime] = useState('')
  const [endDatetime, setEndDatetime] = useState('')
  const [mode, setMode] = useState<'inperson' | 'online'>('inperson')
  const [venueName, setVenueName] = useState('')
  const [city, setCity] = useState('Port-au-Prince')
  const [joinUrl, setJoinUrl] = useState('')

  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)

  const titleInvalid = attempted && title.trim().length < 3
  const startInvalid = attempted && !startDatetime

  const handleCreate = async () => {
    setAttempted(true)

    if (title.trim().length < 3 || !startDatetime) {
      showToast({
        type: 'error',
        title: 'Almost there',
        message: 'Add an event name and a start date to continue.',
        duration: 4000,
      })
      return
    }

    setSaving(true)
    try {
      const eventData = {
        organizer_id: userId,
        title: title.trim(),
        description: summary.trim(),
        category,
        venue_name: mode === 'inperson' ? venueName.trim() : '',
        country: 'HT',
        city: mode === 'inperson' ? city.trim() || 'Port-au-Prince' : '',
        commune: '',
        address: '',
        start_datetime: startDatetime ? new Date(startDatetime).toISOString() : null,
        end_datetime: endDatetime ? new Date(endDatetime).toISOString() : null,
        ticket_price: 0,
        total_tickets: 0,
        currency: normalizeEventCurrencyForCountry('HT', 'USD'),
        banner_image_url: bannerUrl || null,
        is_published: false,
        is_online: mode === 'online',
        join_url: mode === 'online' ? joinUrl.trim() || null : null,
        tags: [] as string[],
        status: 'draft',
      }

      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 600))
        showToast({
          type: 'success',
          title: 'Draft created',
          message: 'Demo mode — opening the editor.',
          duration: 3000,
        })
        router.push('/organizer/events')
        return
      }

      const { data, error } = await firebaseDb
        .from('events')
        .insert(eventData)
        .select()
        .single()

      if (error) throw error

      showToast({
        type: 'success',
        title: 'Draft created',
        message: 'Now add tickets and details — then publish when ready.',
        duration: 3500,
      })
      router.push(`/organizer/events/${data.id}/edit`)
      router.refresh()
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Could not create event',
        message: err?.message || 'Please try again.',
        duration: 5000,
      })
    } finally {
      setSaving(false)
    }
  }

  const inputBase =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white [color-scheme:dark] transition-all placeholder:text-white/40 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40'
  const sectionLabel = 'flex items-center gap-2 text-sm font-semibold text-white/80'

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_minmax(0,380px)]">
        {/* LEFT — the event, edited inline */}
        <div className="order-2 min-w-0 lg:order-1">
          <p className="eyebrow mb-3 text-brand-300">New event</p>

          {/* Title */}
          <input
            id="qc-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My event name"
            className="w-full bg-transparent font-display text-[clamp(34px,6vw,56px)] leading-[1.02] tracking-tight text-white placeholder:text-white/25 focus:outline-none"
          />
          {titleInvalid && (
            <p className="mt-1 text-sm text-red-300">Give your event a name (3+ characters).</p>
          )}

          {/* Short summary (optional) */}
          <div className="mt-3">
            {showSummary || summary ? (
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Add a short summary…"
                rows={2}
                autoFocus={showSummary}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white/70 placeholder:text-white/30 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowSummary(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-4 w-4" /> Short summary
              </button>
            )}
          </div>

          {/* Category */}
          <div className="mt-7">
            <span className={sectionLabel}>
              <Sparkles className="h-4 w-4 text-brand-300" /> Category
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = category === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                      active
                        ? 'border-brand-500 bg-brand-600 text-white'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* When */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <span className={sectionLabel}>
              <CalendarDays className="h-4 w-4 text-brand-300" /> When
            </span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/50">Starts *</span>
                <input
                  type="datetime-local"
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                  className={`${inputBase} ${startInvalid ? 'border-red-400/60' : ''}`}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/50">Ends</span>
                <input
                  type="datetime-local"
                  value={endDatetime}
                  min={startDatetime || undefined}
                  onChange={(e) => setEndDatetime(e.target.value)}
                  className={inputBase}
                />
              </label>
            </div>
            {startInvalid && (
              <p className="mt-1.5 text-sm text-red-300">Pick when your event starts.</p>
            )}
          </div>

          {/* Where */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <span className={sectionLabel}>
              <MapPin className="h-4 w-4 text-brand-300" /> Where
            </span>
            <div className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(
                [
                  { key: 'inperson', label: 'In person', icon: MapPin },
                  { key: 'online', label: 'Online', icon: Globe },
                ] as const
              ).map(({ key, label, icon: Icon }) => {
                const active = mode === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                      active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/90'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                )
              })}
            </div>

            {mode === 'inperson' ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Venue name"
                  className={inputBase}
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className={inputBase}
                />
              </div>
            ) : (
              <div className="mt-3">
                <input
                  type="url"
                  value={joinUrl}
                  onChange={(e) => setJoinUrl(e.target.value)}
                  placeholder="Stream or meeting link (optional)"
                  className={inputBase}
                />
              </div>
            )}
          </div>

          <p className="mt-8 text-[13px] leading-relaxed text-white/40">
            Tickets, full description and page settings come next — nothing goes public
            until you publish.
          </p>
        </div>

        {/* RIGHT — flyer + create (sticky) */}
        <div className="order-1 lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <ImageUpload
                currentImage={bannerUrl}
                onImageUploaded={(url) => setBannerUrl(url)}
              />
            </div>
            <p className="text-center text-xs text-white/40">
              A bold flyer does the heavy lifting — 4:5 portrait looks best.
            </p>

            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="w-full rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create event'}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-white/40">
              <Sparkles className="h-3.5 w-3.5" /> Saved as a private draft
            </p>

            <button
              type="button"
              onClick={() => router.push('/organizer/events')}
              className="w-full rounded-xl px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
