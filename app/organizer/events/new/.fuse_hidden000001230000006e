'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { firebaseDb } from '@/lib/firebase-db/client'
import { isDemoMode } from '@/lib/demo'
import { useToast } from '@/components/ui/Toast'
import ImageUpload from '@/components/ImageUpload'
import { normalizeEventCurrencyForCountry } from '@/lib/currency-policy'
import {
  CalendarDays,
  ChevronDown,
  Globe,
  Image as ImageIcon,
  Info,
  Lock,
  MapPin,
  Music2,
  Palette,
  Pencil,
  Plus,
  Repeat,
  Settings,
  Star,
  Ticket,
  Trash2,
  Type,
  Users,
  X,
  Youtube,
} from 'lucide-react'

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

const ACCENTS = ['#14B8A6', '#F2B705', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#F97316']

interface QuickCreateEventProps {
  userId: string
  isVerified?: boolean
}

interface TicketTier {
  id: string
  name: string
  price: string
  qty: string
}

type GuestRole = 'Performer' | 'Host' | 'DJ' | 'Special Guest'
const GUEST_ROLES: GuestRole[] = ['Performer', 'Host', 'DJ', 'Special Guest']

interface Guest {
  id: string
  name: string
  role: GuestRole
}

const makeId = () => Math.random().toString(36).slice(2, 9)

/* ----------------------------- small UI atoms ----------------------------- */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-white/15'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  )
}

function SectionTitle({
  icon: Icon,
  children,
  right,
}: {
  icon: any
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
        <Icon className="h-[18px] w-[18px] text-white/70" />
        {children}
      </span>
      {right}
    </div>
  )
}

/**
 * Posh-style event create: the page IS the event, edited inline. Single screen,
 * no wizard. Reuses the existing draft-create logic (firebaseDb insert) and hands
 * off to the full editor afterwards for deep refinement.
 */
export default function QuickCreateEvent({ userId }: QuickCreateEventProps) {
  const router = useRouter()
  const { showToast } = useToast()

  // Core
  const [sellMode, setSellMode] = useState<'tickets' | 'rsvp'>('tickets')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [bannerUrl, setBannerUrl] = useState('')

  // Dates
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [recurring, setRecurring] = useState(false)

  // Details
  const [showDescription, setShowDescription] = useState(false)
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [venueName, setVenueName] = useState('')
  const [category, setCategory] = useState('Concert')
  const [isOnline, setIsOnline] = useState(false)
  const [city, setCity] = useState('Port-au-Prince')

  // Tickets — multiple tiers
  const [tiers, setTiers] = useState<TicketTier[]>([
    { id: makeId(), name: 'General Admission', price: '10', qty: '100' },
  ])
  const [enableWaitlist, setEnableWaitlist] = useState(false)

  const addTier = () =>
    setTiers((prev) => [...prev, { id: makeId(), name: '', price: '0', qty: '100' }])
  const updateTier = (id: string, patch: Partial<TicketTier>) =>
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const removeTier = (id: string) =>
    setTiers((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== id) : prev))

  // Guestlist — artists / hosts / performers joining the event (the lineup)
  const [guests, setGuests] = useState<Guest[]>([])
  const [guestName, setGuestName] = useState('')
  const [guestRole, setGuestRole] = useState<GuestRole>('Performer')

  const addGuest = () => {
    const name = guestName.trim()
    if (!name) return
    setGuests((prev) => [...prev, { id: makeId(), name, role: guestRole }])
    setGuestName('')
  }
  const removeGuest = (id: string) => setGuests((prev) => prev.filter((g) => g.id !== id))

  // Visibility extras
  const [showGuestlist, setShowGuestlist] = useState(true)
  const [showOnExplore, setShowOnExplore] = useState(true)
  const [passwordProtected, setPasswordProtected] = useState(false)

  // Style
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [titleFont, setTitleFont] = useState<'Default' | 'Serif' | 'Sans'>('Default')
  const [accentColor, setAccentColor] = useState('#14B8A6')

  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)

  const titleInvalid = attempted && title.trim().length < 3
  const startInvalid = attempted && !startDate

  const tzLabel = (() => {
    const off = -new Date().getTimezoneOffset() / 60
    return `GMT${off >= 0 ? '+' : ''}${off}`
  })()

  const composeISO = (d: string, t: string) =>
    d ? new Date(`${d}T${t || '00:00'}`).toISOString() : null

  const handleCreate = async () => {
    setAttempted(true)
    if (title.trim().length < 3 || !startDate) {
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
      const isRsvp = sellMode === 'rsvp'
      const cleanTiers = tiers
        .map((t) => ({
          name: t.name.trim() || 'General Admission',
          price: Number(t.price) || 0,
          quantity: Number(t.qty) || 0,
        }))
      const firstTier = cleanTiers[0] || { name: 'General Admission', price: 0, quantity: 0 }
      const totalQty = cleanTiers.reduce((sum, t) => sum + t.quantity, 0)
      const cleanGuests = guests.map((g) => ({ name: g.name, role: g.role }))
      const eventData = {
        organizer_id: userId,
        title: title.trim(),
        description: description.trim() || summary.trim(),
        summary: summary.trim(),
        category,
        venue_name: isOnline ? '' : venueName.trim(),
        country: 'HT',
        city: isOnline ? '' : city.trim() || 'Port-au-Prince',
        commune: '',
        address: isOnline ? '' : address.trim(),
        start_datetime: composeISO(startDate, startTime),
        end_datetime: composeISO(endDate, endTime),
        ticket_price: isRsvp ? 0 : firstTier.price,
        total_tickets: isRsvp ? 0 : totalQty,
        ticket_name: isRsvp ? 'RSVP' : firstTier.name,
        guestlist: cleanGuests,
        currency: normalizeEventCurrencyForCountry('HT', 'USD'),
        banner_image_url: bannerUrl || null,
        is_published: false,
        is_online: isOnline,
        is_recurring: recurring,
        enable_waitlist: enableWaitlist,
        show_guestlist: showGuestlist,
        show_on_explore: showOnExplore,
        password_protected: passwordProtected,
        spotify_url: spotifyUrl.trim() || null,
        title_font: titleFont,
        accent_color: accentColor,
        tags: [] as string[],
        status: 'draft',
      }

      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 600))
        showToast({ type: 'success', title: 'Draft created', message: 'Demo mode — opening the editor.', duration: 3000 })
        router.push('/organizer/events')
        return
      }

      const { data, error } = await firebaseDb.from('events').insert(eventData).select().single()
      if (error) throw error

      // Persist ticket tiers to the canonical `ticket_tiers` collection so the
      // edit form, event page and checkout all read the same source of truth.
      if (!isRsvp && data?.id && cleanTiers.length > 0) {
        const tiersToInsert = cleanTiers.map((t, i) => ({
          event_id: data.id,
          name: t.name,
          price: t.price, // dollars (matches edit form + tier API storage)
          total_quantity: t.quantity,
          sold_quantity: 0,
          description: null,
          sales_start: null,
          sales_end: null,
          sort_order: i,
        }))
        const { error: tiersError } = await firebaseDb.from('ticket_tiers').insert(tiersToInsert)
        if (tiersError) console.error('Error saving ticket tiers:', tiersError)
      }

      showToast({ type: 'success', title: 'Draft created', message: 'Add the finishing touches, then publish.', duration: 3500 })
      router.push(`/organizer/events/${data.id}/edit`)
      router.refresh()
    } catch (err: any) {
      showToast({ type: 'error', title: 'Could not create event', message: err?.message || 'Please try again.', duration: 5000 })
    } finally {
      setSaving(false)
    }
  }

  const rowCls =
    'flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3.5 text-left text-[15px] text-white/70 transition-colors hover:bg-[#242424]'
  const chip =
    'no-native-picker rounded-lg bg-[#2a2a2a] px-3 py-1.5 text-sm font-semibold text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-400/40'
  const field =
    'w-full rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3 text-[15px] text-white [color-scheme:dark] placeholder:text-white/40 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40'

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(0,360px)]">
        {/* ===================== LEFT — the event ===================== */}
        <div className="order-2 min-w-0 lg:order-1">
          {/* Sell Tickets / RSVP */}
          <div className="mx-auto mb-8 grid max-w-md grid-cols-2 rounded-full border border-white/10 bg-[#1c1c1c] p-1">
            {(['tickets', 'rsvp'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSellMode(m)}
                className={`rounded-full py-2.5 text-sm font-semibold transition-all ${
                  sellMode === m ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {m === 'tickets' ? 'Sell Tickets' : 'RSVP'}
              </button>
            ))}
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My event name"
            className="w-full bg-transparent font-display text-[clamp(34px,6vw,52px)] leading-[1.04] tracking-tight text-white placeholder:text-white/25 focus:outline-none"
          />
          {titleInvalid && <p className="mt-1 text-sm text-red-300">Give your event a name (3+ characters).</p>}

          {/* Short summary */}
          <div className="mt-4">
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
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#1c1c1c] px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-4 w-4" /> Short Summary
              </button>
            )}
          </div>

          {/* Dates */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle icon={CalendarDays}>Dates</SectionTitle>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <span className="text-[15px] font-medium text-white">Start</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{tzLabel}</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${chip} ${startInvalid ? 'border-red-400/60' : ''}`} />
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={chip} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3.5">
                <span className="text-[15px] font-medium text-white">End</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">{tzLabel}</span>
                  <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={chip} />
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={chip} />
                </div>
              </div>
            </div>
            {startInvalid && <p className="mt-1.5 text-sm text-red-300">Pick when your event starts.</p>}

            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3.5">
              <span className="flex items-center gap-2 text-[15px] text-white/80">
                <Repeat className="h-4 w-4 text-white/50" /> Recurring Series
              </span>
              <Toggle on={recurring} onChange={setRecurring} />
            </div>
          </div>

          {/* Event Details */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle icon={Info}>Event Details</SectionTitle>
            <div className="space-y-3">
              {showDescription || description ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell people what to expect…"
                  rows={4}
                  autoFocus={showDescription}
                  className={field}
                />
              ) : (
                <button type="button" onClick={() => setShowDescription(true)} className={rowCls}>
                  <Pencil className="h-[18px] w-[18px] text-white/50" /> Add Description
                </button>
              )}

              {/* Online toggle (kept compact) */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3.5">
                <span className="flex items-center gap-2 text-[15px] text-white/80">
                  <Globe className="h-[18px] w-[18px] text-white/50" /> Online event
                </span>
                <Toggle on={isOnline} onChange={setIsOnline} />
              </div>

              {!isOnline && (
                <>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1c1c1c] px-4">
                    <MapPin className="h-[18px] w-[18px] shrink-0 text-white/50" />
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Location / address" className="w-full bg-transparent py-3.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1c1c1c] px-4">
                      <Globe className="h-[18px] w-[18px] shrink-0 text-white/50" />
                      <input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Venue name" className="w-full bg-transparent py-3.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none" />
                    </div>
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={field} />
                  </div>
                </>
              )}

              {/* Category as a Posh-style row of chips */}
              <div className="rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3.5">
                <div className="mb-2.5 flex items-center gap-2 text-[13px] font-medium text-white/50">
                  <Star className="h-4 w-4" /> Category
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                        category === cat
                          ? 'border-brand-500 bg-brand-600 text-white'
                          : 'border-white/10 bg-[#1c1c1c] text-white/60 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tickets */}
          {sellMode === 'tickets' && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <SectionTitle
                icon={Ticket}
                right={
                  <span className="flex items-center gap-2 text-sm text-white/50">
                    Enable waitlist <Toggle on={enableWaitlist} onChange={setEnableWaitlist} />
                  </span>
                }
              >
                Tickets
              </SectionTitle>

              <div className="space-y-3">
                {tiers.map((tier, i) => (
                  <div key={tier.id} className="space-y-3 rounded-xl border border-white/10 bg-[#1c1c1c] p-4">
                    <div className="flex items-center gap-2">
                      <input
                        value={tier.name}
                        onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                        placeholder={`Ticket type ${i + 1} (e.g. General, VIP, Early Bird)`}
                        className={field}
                      />
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(tier.id)}
                          className="shrink-0 rounded-lg border border-white/10 p-2.5 text-white/40 transition-colors hover:bg-white/5 hover:text-red-300"
                          aria-label="Remove ticket type"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs text-white/50">Price (USD)</span>
                        <input type="number" min="0" value={tier.price} onChange={(e) => updateTier(tier.id, { price: e.target.value })} className={field} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-white/50">Quantity</span>
                        <input type="number" min="0" value={tier.qty} onChange={(e) => updateTier(tier.id, { qty: e.target.value })} className={field} />
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addTier}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-transparent px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white"
                >
                  <Plus className="h-4 w-4" /> Add ticket type
                </button>
              </div>
            </div>
          )}

          {/* Guestlist — the lineup: artists, hosts & special guests joining */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle
              icon={Users}
              right={<Toggle on={showGuestlist} onChange={setShowGuestlist} />}
            >
              Guestlist
            </SectionTitle>
            <p className="mb-3 text-sm text-white/50">
              Add the artists, hosts, DJs and special guests performing or joining your event.
            </p>

            <div className="space-y-3 rounded-xl border border-white/10 bg-[#1c1c1c] p-4">
              {/* Existing guests */}
              {guests.length > 0 && (
                <div className="space-y-2">
                  {guests.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 rounded-lg bg-[#2a2a2a] px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        {g.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-white">{g.name}</span>
                        <span className="block text-xs text-white/50">{g.role}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeGuest(g.id)}
                        className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-red-300"
                        aria-label={`Remove ${g.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new guest */}
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addGuest()
                  }
                }}
                placeholder="Artist or guest name"
                className={field}
              />
              <div className="flex flex-wrap gap-2">
                {GUEST_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setGuestRole(role)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      guestRole === role
                        ? 'border-brand-500 bg-brand-600 text-white'
                        : 'border-white/10 bg-[#1c1c1c] text-white/60 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={addGuest}
                disabled={!guestName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Add to guestlist
              </button>
            </div>
          </div>

          {/* Event Features */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle icon={Star}>Event Features</SectionTitle>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-4">
              <span className="text-sm text-white/50">Showcase your event&rsquo;s performers, sponsors and more.</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white/50">
                Add feature <ChevronDown className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 px-1 text-xs text-white/35">Available in the editor after you create the event.</p>
          </div>

          {/* Media rows */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-[15px] text-white/45">
              <Youtube className="h-[18px] w-[18px]" /> YouTube Video
            </div>
            <div className="flex items-center gap-3 text-[15px] text-white/45">
              <ImageIcon className="h-[18px] w-[18px]" /> Image Gallery
            </div>
          </div>

          {/* Page Settings */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle icon={Settings}>Page Settings</SectionTitle>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3.5">
                <span className="text-[15px] text-white/80">Show on Explore</span>
                <Toggle on={showOnExplore} onChange={setShowOnExplore} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3.5">
                <span className="flex items-center gap-2 text-[15px] text-white/80">
                  <Lock className="h-4 w-4 text-white/50" /> Password Protected Event
                </span>
                <Toggle on={passwordProtected} onChange={setPasswordProtected} />
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT — flyer + style ===================== */}
        <div className="order-1 lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Flyer */}
            <ImageUpload variant="flyer" currentImage={bannerUrl} onImageUploaded={(url) => setBannerUrl(url)} />

            {/* Spotify */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1c1c1c] px-4">
              <Music2 className="h-[18px] w-[18px] shrink-0 text-white/50" />
              <input
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="Add song from Spotify"
                className="w-full bg-transparent py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>

            {/* Font + accent */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#1c1c1c] p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-white/80">
                  <Type className="h-4 w-4 text-white/50" /> Title Font
                </span>
                <select
                  value={titleFont}
                  onChange={(e) => setTitleFont(e.target.value as any)}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-sm text-white [color-scheme:dark] focus:outline-none"
                >
                  <option>Default</option>
                  <option>Serif</option>
                  <option>Sans</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-white/80">
                  <Palette className="h-4 w-4 text-white/50" /> Accent Color
                </span>
                <div className="flex items-center gap-1.5">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      className={`h-5 w-5 rounded-full transition-transform ${accentColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Create */}
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="w-full rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create Event'}
            </button>
            <p className="text-center text-xs text-white/40">Saved as a private draft — publish when you&rsquo;re ready.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
