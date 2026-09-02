'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { firebaseDb } from '@/lib/firebase-db/client'
// Raw firebase SDK: the firebaseDb shim only handles top-level collections, so
// the hashed access code is written straight to the events/{id}/private/access
// subdoc via setDoc.
import { db } from '@/lib/firebase/client'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { isDemoMode } from '@/lib/demo'
import { useToast } from '@/components/ui/Toast'
import ImageUpload from '@/components/ImageUpload'
import SpotifySongPicker from '@/components/organizer/SpotifySongPicker'
import { DatePicker, TimePicker } from '@/components/ui/DateTimePickers'
import { normalizeEventCurrencyForCountry, getAllowedEventCurrencies, type EventCurrency } from '@/lib/currency-policy'
import { incidenceForEvent, priceOrder } from '@/lib/checkout/buyer-pricing'
import { fromCents } from '@/lib/ticketPricing'
import { THEMES, type PosterThemeKey } from '@/lib/posterGradient'
import {
  CalendarDays,
  Globe,
  Image as ImageIcon,
  Info,
  Lock,
  MapPin,
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

const ACCENTS: { hex: string; name: string }[] = [
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#F2B705', name: 'Gold' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#8B5CF6', name: 'Purple' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#F97316', name: 'Orange' },
]

/**
 * Poster-theme swatches for the `theme_key` picker, derived from the single
 * source of truth: the exported THEMES map in `lib/posterGradient.ts` (the
 * poster resolver). Persisting one of these keys pins the poster gradient
 * everywhere the resolver runs; '' = Auto. No colors are defined here.
 */
const POSTER_THEME_SWATCHES: { key: PosterThemeKey; bg: string }[] = (
  Object.keys(THEMES) as PosterThemeKey[]
).map((key) => ({ key, bg: THEMES[key].bg }))

// Recurring-event cadence options for the "Repeats" selector (create-only).
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'
const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]
/** Hard cap on how many occurrences a single recurring series may generate. */
const MAX_RECURRENCE_COUNT = 52

/**
 * Shift a base datetime by `i` steps of the given cadence, preserving the
 * time-of-day. Monthly steps clamp the day-of-month to the target month's
 * length (e.g. Jan 31 + 1 month → Feb 28/29) so no occurrence rolls into the
 * following month. Mirrors mobile/lib/api/events.ts:shiftDateByRecurrence.
 */
function shiftDateByRecurrence(base: Date, cadence: 'daily' | 'weekly' | 'monthly', i: number): Date {
  const d = new Date(base.getTime())
  if (cadence === 'daily') {
    d.setDate(d.getDate() + i)
  } else if (cadence === 'weekly') {
    d.setDate(d.getDate() + i * 7)
  } else {
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() + i)
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, lastDayOfMonth))
  }
  return d
}

/**
 * SHA-256 hex of a string, computed client-side via the Web Crypto API. Used to
 * hash the trimmed access code before it is written to the private/access
 * subdoc. The plaintext code is NEVER stored or logged.
 */
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface EventComposerProps {
  userId: string
  isVerified?: boolean
  verificationStatus?: string
  /** When provided, the composer runs in EDIT mode (prefilled + updates this event). */
  event?: any
  /** Existing ticket tiers for the event being edited. */
  initialTiers?: TicketTier[]
  /**
   * GUEST mode (/create): anyone can compose the whole event signed out. The
   * form autosaves to localStorage; the save button routes through sign-up
   * (or the become-organizer step when `authed`), and /organizer/events/new
   * restores the draft afterwards — nothing typed is lost to the login wall.
   */
  guest?: boolean
  /** Guest mode only: the visitor IS signed in, just not an organizer yet. */
  authed?: boolean
}

/** Where a signed-out composition survives the trip through sign-up. */
const DRAFT_KEY = 'tikem:event-draft'

interface TicketTier {
  id: string
  name: string
  price: string
  qty: string
  /** Optional per-tier SALE window, stored as ISO 8601 strings ('' = no bound). */
  salesStart?: string
  salesEnd?: string
  /**
   * Optional per-tier ENTRY (validity) window — when this ticket admits the
   * holder, distinct from when it can be bought. ISO 8601 strings ('' = admits
   * anytime). Matches mobile's valid_from / valid_until contract.
   */
  validFrom?: string
  validUntil?: string
}

const pad2 = (n: number) => String(n).padStart(2, '0')
/** Split an ISO datetime into local 'yyyy-MM-dd' + 'HH:mm' strings for the pickers. */
function splitISO(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  }
}

/** ISO string → value for a `<input type="datetime-local">` (local time), or ''. */
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** `datetime-local` value → ISO string, or null when empty/invalid. */
function localInputToISO(local?: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
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

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${on ? 'border-brand-500 bg-brand-600' : 'border-white/20 bg-white/15'}`}
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
 * Posh-style event composer: the page IS the event, edited inline on a single
 * screen (no wizard). Powers BOTH creating a new event and editing an existing
 * one — pass an `event` (and `initialTiers`) to run in edit mode, where Save
 * updates the event and the publish control toggles its live state.
 */
export default function EventComposer({
  userId,
  isVerified = false,
  event,
  initialTiers,
  guest = false,
  authed = false,
}: EventComposerProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { t } = useTranslation('common')

  const isEdit = !!event
  const start0 = splitISO(event?.start_datetime)
  const end0 = splitISO(event?.end_datetime)

  // Core
  const [sellMode, setSellMode] = useState<'tickets' | 'rsvp'>(
    isEdit && event?.ticket_name === 'RSVP' ? 'rsvp' : 'tickets'
  )
  const [title, setTitle] = useState(event?.title || '')
  const [summary, setSummary] = useState(event?.summary || '')
  const [showSummary, setShowSummary] = useState(!!event?.summary)
  const [bannerUrl, setBannerUrl] = useState(event?.banner_image_url || '')

  // Dates
  const [startDate, setStartDate] = useState(start0.date)
  const [startTime, setStartTime] = useState(start0.time)
  const [endDate, setEndDate] = useState(end0.date)
  const [endTime, setEndTime] = useState(end0.time)
  // Recurrence is create-only; editing never regenerates a series, so the
  // control is hidden in edit mode (mobile parity). A stored is_recurring on the
  // event doc is preserved on edit but not acted upon.
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [recurrenceCount, setRecurrenceCount] = useState(4)
  // How the series length is bounded: 'count' generates N occurrences; 'until'
  // steps by cadence until (and including) recurrenceEndDate (capped at 52).
  const [recurrenceMode, setRecurrenceMode] = useState<'count' | 'until'>('count')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')

  // Details
  const [showDescription, setShowDescription] = useState(!!event?.description)
  const [description, setDescription] = useState(event?.description || '')
  const [address, setAddress] = useState(event?.address || '')
  const [venueName, setVenueName] = useState(event?.venue_name || '')
  const [category, setCategory] = useState(event?.category || 'Concert')
  const [isOnline, setIsOnline] = useState(!!event?.is_online)
  const [city, setCity] = useState(event?.city || 'Port-au-Prince')

  // Currency — HT organizers may price in HTG or USD. Attendee views default to
  // HTG, so new events default to HTG here (edit mode keeps the stored choice).
  const allowedCurrencies = getAllowedEventCurrencies('HT')
  const [currency, setCurrency] = useState<EventCurrency>(
    isEdit ? normalizeEventCurrencyForCountry('HT', event?.currency || 'HTG') : 'HTG'
  )

  // Tickets — multiple tiers
  const [tiers, setTiers] = useState<TicketTier[]>(
    initialTiers && initialTiers.length > 0
      ? initialTiers.map((t) => ({
          ...t,
          salesStart: isoToLocalInput((t as any).salesStart ?? (t as any).sales_start),
          salesEnd: isoToLocalInput((t as any).salesEnd ?? (t as any).sales_end),
          validFrom: isoToLocalInput((t as any).validFrom ?? (t as any).valid_from),
          validUntil: isoToLocalInput((t as any).validUntil ?? (t as any).valid_until),
        }))
      : [{ id: makeId(), name: 'General Admission', price: '10', qty: '100' }]
  )
  const [enableWaitlist, setEnableWaitlist] = useState(!!event?.enable_waitlist)

  const addTier = () =>
    setTiers((prev) => [...prev, { id: makeId(), name: '', price: '0', qty: '100' }])
  const updateTier = (id: string, patch: Partial<TicketTier>) =>
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const removeTier = (id: string) =>
    setTiers((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== id) : prev))

  // Guestlist — artists / hosts / performers joining the event (the lineup)
  const [guests, setGuests] = useState<Guest[]>(
    Array.isArray(event?.guestlist)
      ? event.guestlist.map((g: any) => ({
          id: makeId(),
          name: typeof g === 'string' ? g : g?.name || '',
          role: (g?.role as GuestRole) || 'Performer',
        }))
      : []
  )
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
  const [showGuestlist, setShowGuestlist] = useState(event?.show_guestlist ?? true)
  const [showOnExplore, setShowOnExplore] = useState(event?.show_on_explore ?? true)
  // Password gate — public flag on the doc; the secret lives hashed in the
  // private/access subdoc, never on the event doc. The code input stays blank in
  // edit mode (the hash is write-only), so a blank code on save keeps it.
  const [passwordProtected, setPasswordProtected] = useState(!!event?.is_password_protected)
  const [accessCode, setAccessCode] = useState('')

  // WHO PAYS THE SERVICE FEE for this event. The default follows the country
  // (Haiti absorbs it into the organizer's proceeds, US/CA/FR adds it on top),
  // and this toggle overrides that default for this event alone — so a Haitian
  // organizer selling to the diaspora can pass it on, and a US organizer running
  // a community night can absorb it.
  const [passFeesToBuyer, setPassFeesToBuyer] = useState(
    incidenceForEvent({ country: 'HT', fee_incidence: event?.fee_incidence }) === 'buyer'
  )

  // Style
  const [spotifyUrl, setSpotifyUrl] = useState(event?.spotify_url || '')
  // Optional promo video link (default '').
  const [videoUrl, setVideoUrl] = useState(event?.video_url || '')
  // Poster-theme override ('' = Auto). A valid key pins the poster gradient.
  const [themeKey, setThemeKey] = useState<string>(event?.theme_key || '')
  const [titleFont, setTitleFont] = useState<'Default' | 'Serif' | 'Sans'>(event?.title_font || 'Default')
  const [accentColor, setAccentColor] = useState(event?.accent_color || '#14B8A6')

  // Edit-only: published state (toggled via the publish control)
  const [isPublished, setIsPublished] = useState(!!event?.is_published)
  const [publishing, setPublishing] = useState(false)

  // A restored draft gets a visible escape hatch (see the Start fresh button).
  const [draftRestored, setDraftRestored] = useState(false)

  // ── Guest draft: restore ──────────────────────────────────────────────
  // Create mode only. Runs in an effect (not initializers) so SSR and the
  // first client render agree, then the draft lands in one pass. The same
  // restore serves both /create (guest returning) and /organizer/events/new
  // (fresh organizer arriving from the sign-up trip).
  useEffect(() => {
    if (isEdit) return
    let d: any = null
    try {
      d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    } catch {
      /* unreadable draft — start clean */
    }
    if (!d || typeof d !== 'object' || (!d.title && !d.banner_image_url)) return
    // Stale drafts expire (shared devices, abandoned tabs) — matches the
    // guest-upload TTL, so a restored draft's poster is still alive.
    if (typeof d.saved_at === 'number' && Date.now() - d.saved_at > 7 * 24 * 3600 * 1000) {
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {}
      return
    }
    const s0 = splitISO(d.start_datetime)
    const e0 = splitISO(d.end_datetime)
    if (d.ticket_name === 'RSVP') setSellMode('rsvp')
    setTitle(d.title || '')
    if (d.summary) {
      setSummary(d.summary)
      setShowSummary(true)
    }
    if (d.banner_image_url) setBannerUrl(d.banner_image_url)
    if (s0.date) setStartDate(s0.date)
    if (s0.time) setStartTime(s0.time)
    if (e0.date) setEndDate(e0.date)
    if (e0.time) setEndTime(e0.time)
    if (d.description && d.description !== d.summary) {
      setDescription(d.description)
      setShowDescription(true)
    }
    if (d.address) setAddress(d.address)
    if (d.venue_name) setVenueName(d.venue_name)
    if (d.category) setCategory(d.category)
    if (d.is_online) setIsOnline(true)
    if (d.city) setCity(d.city)
    if (d.currency) setCurrency(normalizeEventCurrencyForCountry('HT', d.currency))
    if (Array.isArray(d.tiers) && d.tiers.length > 0) {
      setTiers(
        d.tiers.map((t: any) => ({
          id: makeId(),
          name: t.name || '',
          price: String(t.price ?? 0),
          qty: String(t.quantity ?? 100),
          salesStart: isoToLocalInput(t.sales_start),
          salesEnd: isoToLocalInput(t.sales_end),
          validFrom: isoToLocalInput(t.valid_from),
          validUntil: isoToLocalInput(t.valid_until),
        }))
      )
    }
    if (Array.isArray(d.guestlist) && d.guestlist.length > 0) {
      setGuests(
        d.guestlist
          .map((g: any) => ({ id: makeId(), name: g?.name || '', role: (g?.role as GuestRole) || 'Performer' }))
          .filter((g: any) => g.name)
      )
    }
    if (d.show_guestlist === false) setShowGuestlist(false)
    if (d.show_on_explore === false) setShowOnExplore(false)
    // The access CODE is never persisted (secret) — restoring the flag makes
    // accessCodeInvalid demand a fresh code before create, instead of silently
    // creating a public event the guest believed was protected.
    if (d.is_password_protected) setPasswordProtected(true)
    if (d.fee_incidence) setPassFeesToBuyer(d.fee_incidence === 'buyer')
    if (d.enable_waitlist) setEnableWaitlist(true)
    if (d.spotify_url) setSpotifyUrl(d.spotify_url)
    if (d.video_url) setVideoUrl(d.video_url)
    if (d.theme_key) setThemeKey(d.theme_key)
    if (d.title_font) setTitleFont(d.title_font)
    if (d.accent_color) setAccentColor(d.accent_color)
    // The recurrence plan survives the round trip too (create-only controls).
    if (d.recurrence && d.recurrence !== 'none') {
      setRecurrence(d.recurrence)
      if (d.recurrence_mode === 'until') setRecurrenceMode('until')
      if (Number(d.recurrence_count) >= 2) setRecurrenceCount(Number(d.recurrence_count))
      if (d.recurrence_end_date) setRecurrenceEndDate(d.recurrence_end_date)
    }
    setDraftRestored(true)
    if (!guest) {
      showToast({
        type: 'success',
        title: t('composer.toasts.welcomeTitle', { defaultValue: 'Welcome back' }),
        message: t('composer.toasts.welcomeMsg', {
          defaultValue: 'We kept your event draft — review it and hit Create.',
        }),
        duration: 4500,
      })
    }
    // Restore is a one-time mount concern by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Region payout-profile nudge (tester feedback, 2026-08-12/29) ──
  // An event's country decides WHICH payout profile pays out: Haiti profile
  // (MonCash/bank, verified by Tikèm) vs the Stripe profile (US·CA·FR events).
  // Say so here, while the organizer is still composing, instead of only
  // erroring at publish. Advisory only — the publish route stays the gate.
  const [payoutProfileGap, setPayoutProfileGap] = useState<null | 'haiti' | 'stripe_connect'>(null)
  useEffect(() => {
    if (isDemoMode()) return
    if (guest) return // no organizer yet — nothing to nudge about
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/organizer/payout-config-summary')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data?.profiles) return
        const country = String(event?.country || 'HT').toUpperCase()
        const needsStripe = country === 'US' || country === 'CA' || country === 'FR'
        if (needsStripe && !data.profiles.stripeConnect?.configured) {
          setPayoutProfileGap('stripe_connect')
        } else if (!needsStripe && !data.profiles.haiti?.configured) {
          setPayoutProfileGap('haiti')
        }
      } catch {
        // Nudge only — no summary, no notice.
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.country])

  // Edit-only: when this event belongs to a recurring series, the organizer can
  // opt to apply the shared field edits to every sibling (each keeps its own
  // start/end datetimes and series_id).
  const seriesId: string | undefined = isEdit ? event?.series_id : undefined
  const [applyToSeries, setApplyToSeries] = useState(false)

  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)

  const composeISO = (d: string, t: string) =>
    d ? new Date(`${d}T${t || '00:00'}`).toISOString() : null

  // Validation
  const startISOv = composeISO(startDate, startTime)
  const endISOv = composeISO(endDate, endTime)
  const endBeforeStart = !!(
    startISOv &&
    endISOv &&
    new Date(endISOv).getTime() <= new Date(startISOv).getTime()
  )
  const needsLocation = !isOnline && !venueName.trim() && !address.trim() && !city.trim()

  const titleInvalid = attempted && title.trim().length < 3
  const startInvalid = attempted && !startDate
  const endInvalid = attempted && endBeforeStart
  const locationInvalid = attempted && needsLocation

  // Per-tier sale window: when BOTH bounds are set, end must be after start.
  const saleWindowInvalid = (t: TicketTier): boolean => {
    if (!t.salesStart || !t.salesEnd) return false
    const s = new Date(t.salesStart).getTime()
    const e = new Date(t.salesEnd).getTime()
    return Number.isFinite(s) && Number.isFinite(e) && e <= s
  }
  const anySaleWindowInvalid = sellMode === 'tickets' && tiers.some(saleWindowInvalid)

  // "Free" and "not filled in" must never be the same thing: `Number('') || 0`
  // is 0, so a blank price field would silently save the tier as a FREE tier and
  // give the ticket away. Require an explicit value (0 is allowed, and is how the
  // organizer says "free"); reject blank and negative.
  const tierPriceUnset = (t: TicketTier): boolean => {
    const raw = String(t.price ?? '').trim()
    if (raw === '') return true
    const n = Number(raw)
    return !Number.isFinite(n) || n < 0
  }
  const anyTierPriceUnset = sellMode === 'tickets' && tiers.some(tierPriceUnset)

  // Per-tier entry (validity) window: when BOTH bounds are set, valid_until
  // must be after valid_from.
  const validityWindowInvalid = (t: TicketTier): boolean => {
    if (!t.validFrom || !t.validUntil) return false
    const s = new Date(t.validFrom).getTime()
    const e = new Date(t.validUntil).getTime()
    return Number.isFinite(s) && Number.isFinite(e) && e <= s
  }
  const anyValidityWindowInvalid = sellMode === 'tickets' && tiers.some(validityWindowInvalid)

  // Access code: required (min 6) when enabling protection on CREATE; on edit a
  // blank code keeps the existing hash, but a typed code must still be >= 6.
  const trimmedCode = accessCode.trim()
  const accessCodeInvalid =
    passwordProtected &&
    ((!isEdit && trimmedCode.length < 6) || (trimmedCode.length > 0 && trimmedCode.length < 6))

  const tzLabel = (() => {
    const off = -new Date().getTimezoneOffset() / 60
    return `GMT${off >= 0 ? '+' : ''}${off}`
  })()

  const isPaid = sellMode === 'tickets' && tiers.some((t) => Number(t.price) > 0)

  // A worked example on the organizer's own cheapest paid ticket, so the toggle
  // is a number rather than a policy statement. Uses the same pricing function
  // the buyer's checkout does, capped fee included.
  const feeExample = (() => {
    const paidPrices = tiers.map((t) => Number(t.price) || 0).filter((p) => p > 0)
    if (!paidPrices.length) return ''
    const price = Math.min(...paidPrices)
    const pricing = priceOrder(
      price,
      { country: 'HT', currency, fee_incidence: passFeesToBuyer ? 'buyer' : 'organizer' },
      { quantity: 1, currency }
    )
    const money = (amount: number) => `${amount.toLocaleString()} ${currency}`
    return passFeesToBuyer
      ? t('composer.fee.example', {
          defaultValue: 'A {{price}} ticket: the buyer pays {{total}} and you receive {{net}}.',
          price: money(price),
          total: money(pricing.total),
          net: money(price),
        })
      : t('composer.fee.example', {
          defaultValue: 'A {{price}} ticket: the buyer pays {{total}} and you receive {{net}}.',
          price: money(price),
          total: money(price),
          net: money(fromCents(pricing.cents.organizerNet)),
        })
  })()
  const paidPublishingBlocked = isPaid && !isVerified

  // Build the shared event payload from the current form state.
  const buildEventData = () => {
    const isRsvp = sellMode === 'rsvp'
    const cleanTiers = tiers.map((t) => ({
      name: t.name.trim() || 'General Admission',
      price: Number(t.price) || 0,
      quantity: Number(t.qty) || 0,
      // Per-tier sale window as ISO strings (or null). Matches mobile's format so
      // the web purchase routes and selector enforce/display identical bounds.
      sales_start: localInputToISO(t.salesStart),
      sales_end: localInputToISO(t.salesEnd),
      // Per-tier ENTRY (validity) window as ISO strings (or null) — when the
      // ticket admits the holder. Empty = admits anytime. Mobile contract.
      valid_from: localInputToISO(t.validFrom),
      valid_until: localInputToISO(t.validUntil),
    }))
    const firstTier = cleanTiers[0] || { name: 'General Admission', price: 0, quantity: 0 }
    const totalQty = cleanTiers.reduce((sum, t) => sum + t.quantity, 0)
    const cleanGuests = guests.map((g) => ({ name: g.name, role: g.role }))
    const data: Record<string, any> = {
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
      // `ticket_price` is a "from"/display figure only. It is 0 for any event
      // carrying a free tier, so it can NOT answer "is this event free" once free
      // and paid tiers coexist — `has_paid_tiers` is the authoritative signal for
      // every reader (see mobile/lib/ticketPricing.ts).
      ticket_price: isRsvp ? 0 : firstTier.price,
      has_paid_tiers: !isRsvp && cleanTiers.some((t) => Number(t.price || 0) > 0),
      total_tickets: isRsvp ? 0 : totalQty,
      ticket_name: isRsvp ? 'RSVP' : firstTier.name,
      guestlist: cleanGuests,
      currency: normalizeEventCurrencyForCountry('HT', currency),
      banner_image_url: bannerUrl || null,
      is_online: isOnline,
      // Recurrence is create-only: on edit preserve the stored flag; on create it
      // reflects the chosen cadence (per-occurrence metadata is stamped below).
      is_recurring: isEdit ? !!event?.is_recurring : recurrence !== 'none',
      enable_waitlist: enableWaitlist,
      show_guestlist: showGuestlist,
      show_on_explore: showOnExplore,
      is_password_protected: passwordProtected,
      // Stamped on the event so checkout, the ticket record and the earnings
      // ledger all read the same answer. Free events carry it harmlessly.
      fee_incidence: passFeesToBuyer ? 'buyer' : 'organizer',
      video_url: videoUrl.trim(),
      theme_key: themeKey || '',
      spotify_url: spotifyUrl.trim() || null,
      title_font: titleFont,
      accent_color: accentColor,
    }
    return { data, cleanTiers, isRsvp }
  }

  // Everything the sign-up round trip must preserve: the event payload, the
  // tier set, the recurrence plan, and a timestamp so stale drafts (a shared
  // device, an abandoned tab) expire instead of ambushing the next person.
  const snapshotDraft = () => {
    const { data, cleanTiers } = buildEventData()
    return {
      ...data,
      tiers: cleanTiers,
      recurrence,
      recurrence_mode: recurrenceMode,
      recurrence_count: recurrenceCount,
      recurrence_end_date: recurrenceEndDate,
      saved_at: Date.now(),
    }
  }

  // ── Guest draft: autosave ─────────────────────────────────────────────
  // Debounced snapshot on every change while composing signed-out, so even a
  // closed tab keeps the work. A poster alone (no title yet) also counts —
  // otherwise that upload would be orphaned. (organizer_id in the snapshot is
  // '' and is ignored on restore.)
  useEffect(() => {
    if (!guest) return
    const id = setTimeout(() => {
      try {
        if (!title.trim() && !bannerUrl) return
        localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshotDraft()))
      } catch {
        /* storage unavailable — the save click still carries the draft */
      }
    }, 600)
    return () => clearTimeout(id)
  })

  // Replace the tier set for an event (mirrors the existing editor's behaviour).
  const syncTiers = async (
    eventId: string,
    cleanTiers: Array<{
      name: string
      price: number
      quantity: number
      sales_start: string | null
      sales_end: string | null
      valid_from: string | null
      valid_until: string | null
    }>,
    isRsvp: boolean
  ) => {
    await firebaseDb.from('ticket_tiers').delete().eq('event_id', eventId)
    if (!isRsvp && cleanTiers.length > 0) {
      const tiersToInsert = cleanTiers.map((t, i) => ({
        event_id: eventId,
        name: t.name,
        price: t.price,
        total_quantity: t.quantity,
        sold_quantity: 0,
        description: null,
        // Per-tier sale window (ISO 8601 strings, or null for no bound).
        sales_start: t.sales_start,
        sales_end: t.sales_end,
        // Per-tier entry (validity) window (ISO 8601 strings, or null).
        valid_from: t.valid_from,
        valid_until: t.valid_until,
        sort_order: i,
      }))
      const { error } = await firebaseDb.from('ticket_tiers').insert(tiersToInsert)
      if (error) console.error('Error saving ticket tiers:', error)
    }
  }

  const handleSave = async () => {
    setAttempted(true)
    if (title.trim().length < 3 || !startDate) {
      showToast({
        type: 'error',
        title: t('composer.toasts.almostTitle', { defaultValue: 'Almost there' }),
        message: t('composer.toasts.almostMsg', {
          defaultValue: 'Add an event name and a start date to continue.',
        }),
        duration: 4000,
      })
      return
    }
    if (endBeforeStart) {
      showToast({
        type: 'error',
        title: t('composer.toasts.datesTitle', { defaultValue: 'Check your dates' }),
        message: t('composer.endError', { defaultValue: 'The end time must be after the start time.' }),
        duration: 4000,
      })
      return
    }
    if (needsLocation) {
      showToast({
        type: 'error',
        title: t('composer.toasts.locationTitle', { defaultValue: 'Add a location' }),
        message: t('composer.toasts.locationMsg', {
          defaultValue: 'In-person events need a venue, address, or city.',
        }),
        duration: 4000,
      })
      return
    }
    if (anyTierPriceUnset) {
      showToast({
        type: 'error',
        title: t('composer.toasts.priceTitle', { defaultValue: 'Set a price for every ticket type' }),
        message: t('composer.toasts.priceMsg', {
          defaultValue: 'Enter 0 to make a ticket type free. A blank price is not the same as free.',
        }),
        duration: 5000,
      })
      return
    }
    if (anySaleWindowInvalid) {
      showToast({
        type: 'error',
        title: t('composer.toasts.saleWindowTitle', { defaultValue: 'Check ticket sale windows' }),
        message: t('composer.toasts.saleWindowMsg', {
          defaultValue: 'A ticket’s sales end must be after its sales start.',
        }),
        duration: 4000,
      })
      return
    }
    if (anyValidityWindowInvalid) {
      showToast({
        type: 'error',
        title: t('composer.toasts.validityTitle', { defaultValue: 'Check ticket validity windows' }),
        message: t('composer.toasts.validityMsg', {
          defaultValue: 'A ticket’s valid until must be after its valid from.',
        }),
        duration: 4000,
      })
      return
    }
    if (accessCodeInvalid) {
      showToast({
        type: 'error',
        title: t('composer.toasts.accessTitle', { defaultValue: 'Set an access code' }),
        message: isEdit
          ? t('composer.accessCodeError', { defaultValue: 'Access codes must be at least 6 characters.' })
          : t('composer.toasts.accessMsgNew', {
              defaultValue: 'Protected events need an access code of at least 6 characters.',
            }),
        duration: 4000,
      })
      return
    }

    // GUEST: the whole form is valid — park it and walk them through the door.
    // Sign-up (or the become-organizer step) redirects back to
    // /organizer/events/new, whose restore effect picks the draft right up.
    if (guest) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshotDraft()))
      } catch {
        /* storage unavailable — they'll retype after sign-in, same as today */
      }
      const target = '/organizer/events/new'
      router.push(
        authed
          ? `/organizer?redirect=${encodeURIComponent(target)}`
          : `/auth/signup?redirect=${encodeURIComponent(target)}`
      )
      return
    }

    setSaving(true)
    try {
      const { data, cleanTiers, isRsvp } = buildEventData()

      // A poster uploaded while signed out lives under guest-uploads/ with a
      // 7-day expiry — move it to its permanent home before the event points
      // at it. If the move fails we keep the guest URL: the event still
      // renders, and the cleanup cron never deletes a referenced file.
      if (typeof data.banner_image_url === 'string' && data.banner_image_url.includes('guest-uploads%2F')) {
        try {
          const res = await fetch('/api/guest-upload/promote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: data.banner_image_url }),
          })
          const body = await res.json().catch(() => ({}))
          if (res.ok && body?.url) {
            data.banner_image_url = body.url
            setBannerUrl(body.url)
          }
        } catch {
          /* keep the guest URL — see above */
        }
      }

      // Hash + write the access code to events/{id}/private/access when the event
      // is protected AND a non-empty code was typed. A blank code (edit mode)
      // intentionally preserves any existing hash. Plaintext is never persisted.
      const writeAccessHash = async (eventId: string) => {
        if (!passwordProtected) return
        const code = accessCode.trim()
        if (!code) return
        const codeHash = await sha256Hex(code)
        await setDoc(doc(db, 'events', eventId, 'private', 'access'), {
          code_hash: codeHash,
          updated_at: serverTimestamp(),
        })
      }

      // ----- EDIT: update the existing event -----
      if (isEdit) {
        if (isDemoMode()) {
          await new Promise((r) => setTimeout(r, 500))
          showToast({
            type: 'success',
            title: t('composer.toasts.savedTitle', { defaultValue: 'Changes saved' }),
            message: t('composer.toasts.demoMode', { defaultValue: 'Demo mode.' }),
            duration: 3000,
          })
          return
        }
        const { error } = await firebaseDb.from('events').update(data).eq('id', event.id)
        if (error) throw error
        await syncTiers(event.id, cleanTiers, isRsvp)
        await writeAccessHash(event.id)

        // Optionally fan the same edits out to every sibling in the series. Each
        // sibling keeps its OWN start/end datetimes (and series_id); only the
        // shared fields — and the tier set — are overwritten. Capped at 52.
        let seriesApplied = 0
        if (applyToSeries && seriesId) {
          const { data: siblings } = await firebaseDb
            .from('events')
            .select('*')
            .eq('series_id', seriesId)
          const list = Array.isArray(siblings) ? siblings : []
          // Drop each occurrence's own schedule so siblings keep their dates.
          const { start_datetime, end_datetime, ...sharedData } = data
          for (const sib of list) {
            if (!sib?.id || sib.id === event.id) continue
            if (seriesApplied >= MAX_RECURRENCE_COUNT) break
            const { error: sibErr } = await firebaseDb.from('events').update(sharedData).eq('id', sib.id)
            if (sibErr) throw sibErr
            await syncTiers(sib.id, cleanTiers, isRsvp)
            await writeAccessHash(sib.id)
            seriesApplied++
          }
        }

        showToast({
          type: 'success',
          title: t('composer.toasts.savedTitle', { defaultValue: 'Changes saved' }),
          message:
            seriesApplied > 0
              ? seriesApplied === 1
                ? t('composer.toasts.seriesUpdatedOne', {
                    defaultValue: 'Your event and 1 other in the series were updated.',
                  })
                : t('composer.toasts.seriesUpdatedMany', {
                    defaultValue: 'Your event and {{n}} others in the series were updated.',
                    n: seriesApplied,
                  })
              : t('composer.toasts.updatedMsg', { defaultValue: 'Your event has been updated.' }),
          duration: 3000,
        })
        router.refresh()
        return
      }

      // ----- CREATE: insert a new draft -----
      // Seed the moderation fields the admin Events console filters on. Firestore
      // drops docs missing a filtered field, so without these a new draft would be
      // invisible in the admin "Pending" tab (is_published==false && rejected==false).
      const createData = { ...data, tags: [] as string[], is_published: false, rejected: false, reports_count: 0, status: 'draft' }
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 600))
        try {
          localStorage.removeItem(DRAFT_KEY)
        } catch {}
        showToast({
          type: 'success',
          title: t('composer.toasts.draftTitle', { defaultValue: 'Draft created' }),
          message: t('composer.toasts.draftDemoMsg', { defaultValue: 'Demo mode — opening the editor.' }),
          duration: 3000,
        })
        router.push('/organizer/events')
        return
      }

      // Recurrence plan (CREATE-only — edit returns above and never regenerates).
      // A real cadence generates occurrences one cadence apart, all sharing a
      // series_id. The series length is bounded either by an explicit count OR,
      // when the "Until a date" mode is chosen, by stepping the cadence from the
      // base date until the chosen end date (inclusive). Both cap at 52.
      const cadence = recurrence !== 'none' ? recurrence : null
      const baseStart = data.start_datetime ? new Date(data.start_datetime) : null
      const baseEnd = data.end_datetime ? new Date(data.end_datetime) : null
      // Inclusive end-of-day bound so an occurrence landing on the chosen date
      // still counts. Only used when in "until" mode with a valid date.
      const untilBound =
        cadence && recurrenceMode === 'until' && recurrenceEndDate
          ? new Date(`${recurrenceEndDate}T23:59:59`)
          : null
      const useUntil = !!(untilBound && !Number.isNaN(untilBound.getTime()) && baseStart)
      let occurrenceCount: number
      if (cadence && useUntil && baseStart && untilBound) {
        let n = 0
        for (let i = 0; i < MAX_RECURRENCE_COUNT; i++) {
          if (shiftDateByRecurrence(baseStart, cadence, i).getTime() > untilBound.getTime()) break
          n = i + 1
        }
        occurrenceCount = Math.max(1, n)
      } else if (cadence) {
        occurrenceCount = Math.max(2, Math.min(MAX_RECURRENCE_COUNT, Math.round(recurrenceCount || 2)))
      } else {
        occurrenceCount = 1
      }
      const recurrenceEndISO = useUntil && untilBound ? untilBound.toISOString() : null

      if (cadence && occurrenceCount > 1) {
        const seriesId = `series_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        let firstId = ''
        for (let i = 0; i < occurrenceCount; i++) {
          const occData = {
            ...createData,
            start_datetime: baseStart ? shiftDateByRecurrence(baseStart, cadence, i).toISOString() : null,
            end_datetime: baseEnd ? shiftDateByRecurrence(baseEnd, cadence, i).toISOString() : null,
            is_recurring: true,
            recurrence: cadence,
            series_id: seriesId,
            // Only meaningful in "until" mode; null when the series is bounded by count.
            recurrence_end_date: recurrenceEndISO,
          }
          const { data: occ, error: occErr } = await firebaseDb.from('events').insert(occData).select().single()
          if (occErr) throw occErr
          if (occ?.id) {
            await syncTiers(occ.id, cleanTiers, isRsvp)
            await writeAccessHash(occ.id)
          }
          if (i === 0) firstId = occ?.id || ''
        }
        try {
          localStorage.removeItem(DRAFT_KEY)
        } catch {}
        showToast({
          type: 'success',
          title: t('composer.toasts.seriesTitle', { defaultValue: 'Series created' }),
          message: t('composer.toasts.seriesMsg', {
            defaultValue: '{{n}} events created. Review the first, then Publish below.',
            n: occurrenceCount,
          }),
          duration: 4000,
        })
        if (firstId) router.push(`/organizer/events/${firstId}/edit`)
        else router.push('/organizer/events')
        router.refresh()
        return
      }

      const { data: created, error } = await firebaseDb.from('events').insert(createData).select().single()
      if (error) throw error
      if (created?.id) {
        await syncTiers(created.id, cleanTiers, isRsvp)
        await writeAccessHash(created.id)
      }
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {}
      showToast({
        type: 'success',
        title: t('composer.toasts.draftTitle', { defaultValue: 'Draft created' }),
        message: t('composer.toasts.draftMsg', { defaultValue: 'Review the details, then Publish below.' }),
        duration: 4000,
      })
      router.push(`/organizer/events/${created.id}/edit`)
      router.refresh()
    } catch (err: any) {
      showToast({
        type: 'error',
        title: isEdit
          ? t('composer.toasts.errSaveTitle', { defaultValue: 'Could not save changes' })
          : t('composer.toasts.errCreateTitle', { defaultValue: 'Could not create event' }),
        message: err?.message || t('composer.toasts.tryAgain', { defaultValue: 'Please try again.' }),
        duration: 5000,
      })
    } finally {
      setSaving(false)
    }
  }

  // Edit-only: publish / unpublish (verification-gated for paid events).
  const handleTogglePublish = async () => {
    if (!isEdit || !event?.id) return
    const next = !isPublished
    if (next && paidPublishingBlocked) {
      showToast({
        type: 'error',
        title: t('composer.toasts.verifyTitle', { defaultValue: 'Verification required' }),
        message: t('composer.verifyToPublish', {
          defaultValue: 'Complete identity verification to publish paid events.',
        }),
        duration: 5000,
      })
      return
    }
    setPublishing(true)
    try {
      if (isDemoMode()) {
        await new Promise((r) => setTimeout(r, 400))
        setIsPublished(next)
      } else {
        // Publish through the server route so all gates are enforced:
        // identity verification, the country's payout profile, and (for US/CA)
        // completed Stripe Connect onboarding. Writing is_published directly from
        // the client would bypass those checks.
        const res = await fetch(`/api/events/${event.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_published: next }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            data?.error || t('composer.toasts.publishStatusErr', { defaultValue: 'Could not update publish status' })
          )
        }
        setIsPublished(next)
        router.refresh()

        // The publish route returns non-blocking advisories — today, an event
        // whose country differs from the connected Stripe account's country
        // (payout lands in the account's currency, after a conversion). Show it
        // long and loud enough to be read; it never stops the publish.
        const publishWarnings: Array<{ message?: string }> = Array.isArray(data?.warnings) ? data.warnings : []
        for (const warning of publishWarnings) {
          if (!warning?.message) continue
          showToast({
            type: 'warning',
            title: t('composer.toasts.payoutWarnTitle', { defaultValue: 'Heads up about your payout' }),
            message: warning.message,
            duration: 12000,
          })
        }
      }
      showToast({
        type: 'success',
        title: next
          ? t('composer.toasts.publishedTitle', { defaultValue: 'Event published' })
          : t('composer.toasts.unpublishedTitle', { defaultValue: 'Moved to draft' }),
        message: next
          ? t('composer.toasts.publishedMsg', { defaultValue: 'Your event is now live.' })
          : t('composer.toasts.unpublishedMsg', { defaultValue: 'Your event is hidden from attendees.' }),
        duration: 3500,
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: t('composer.toasts.errUpdateTitle', { defaultValue: 'Could not update' }),
        message: err?.message || t('composer.toasts.tryAgain', { defaultValue: 'Please try again.' }),
        duration: 5000,
      })
    } finally {
      setPublishing(false)
    }
  }

  const rowCls =
    'flex w-full items-center gap-3 rounded-xl border border-white/10 px-4 py-3.5 text-left text-[15px] text-white/70 transition-colors hover:bg-white/[0.04]'
  const field =
    'w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-[15px] text-white [color-scheme:dark] placeholder:text-white/40 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40'

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(0,360px)]">
        {/* ===================== LEFT — the event ===================== */}
        <div className="order-2 min-w-0 lg:order-1">
          {/* Region payout-profile nudge — which profile this event pays through. */}
          {payoutProfileGap && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-amber-300" />
              <p className="text-sm leading-relaxed text-white/80">
                {payoutProfileGap === 'stripe_connect'
                  ? t('composer.payoutGap.stripe', {
                      defaultValue:
                        'Events in the US, Canada or France pay out through your Stripe profile — it isn’t set up yet, so paid tickets can’t publish. ',
                    })
                  : t('composer.payoutGap.haiti', {
                      defaultValue:
                        'Events in Haiti pay out through your Haiti profile (MonCash or bank) — it isn’t set up yet, so paid tickets can’t publish. ',
                    })}
                <a
                  href="/organizer/settings/payouts"
                  className="font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200"
                >
                  {t('composer.payoutGap.cta', { defaultValue: 'Set up payouts' })}
                </a>
              </p>
            </div>
          )}

          {/* Draft signposting — makes the two-step create→edit flow explicit */}
          {isEdit && !isPublished && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3">
              <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-300" />
              <p className="text-sm text-white/80">
                <span className="font-semibold text-white">
                  {t('composer.draftBanner.saved', { defaultValue: 'Draft saved.' })}
                </span>{' '}
                {t('composer.draftBanner.mid', { defaultValue: 'Add the finishing touches, then' })}{' '}
                <span className="font-semibold text-white">
                  {t('composer.draftBanner.publish', { defaultValue: 'Publish' })}
                </span>{' '}
                {t('composer.draftBanner.end', { defaultValue: 'when you’re ready.' })}
              </p>
            </div>
          )}

          {/* Sell Tickets / RSVP */}
          <div className="mx-auto mb-8 grid max-w-md grid-cols-2 rounded-full border border-white/10 p-1">
            {(['tickets', 'rsvp'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSellMode(m)}
                aria-pressed={sellMode === m}
                className={`rounded-full py-2.5 text-sm font-semibold transition-all ${
                  sellMode === m ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                {m === 'tickets'
                  ? t('composer.sellTickets', { defaultValue: 'Sell Tickets' })
                  : t('composer.rsvp', { defaultValue: 'RSVP' })}
              </button>
            ))}
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('composer.titlePlaceholder', { defaultValue: 'My event name' })}
            aria-label="Event name (required)"
            aria-required="true"
            className="w-full bg-transparent font-display text-[clamp(34px,6vw,52px)] leading-[1.04] tracking-tight text-white placeholder:text-white/25 focus:outline-none"
          />
          {titleInvalid && (
            <p className="mt-1 text-sm text-red-300">
              {t('composer.titleError', { defaultValue: 'Give your event a name (3+ characters).' })}
            </p>
          )}

          {/* Short summary */}
          <div className="mt-4">
            {showSummary || summary ? (
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t('composer.summaryPlaceholder', { defaultValue: 'Add a short summary…' })}
                aria-label="Short summary"
                rows={2}
                autoFocus={showSummary}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white/70 placeholder:text-white/30 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowSummary(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <Plus className="h-4 w-4" /> {t('composer.shortSummary', { defaultValue: 'Short Summary' })}
              </button>
            )}
          </div>

          {/* Dates */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle icon={CalendarDays}>{t('composer.dates', { defaultValue: 'Dates' })}</SectionTitle>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <span className="text-[15px] font-medium text-white">
                  {t('composer.start', { defaultValue: 'Start' })} <span className="text-red-300" aria-hidden="true">*</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="label-mono text-[10px] uppercase text-white/70">{tzLabel}</span>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    invalid={startInvalid}
                    placeholder={t('composer.pickDate', { defaultValue: 'Pick a date' })}
                  />
                  <TimePicker value={startTime} onChange={setStartTime} placeholder={t('composer.time', { defaultValue: 'Time' })} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3.5">
                <span className="text-[15px] font-medium text-white">{t('composer.end', { defaultValue: 'End' })}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="label-mono text-[10px] uppercase text-white/70">{tzLabel}</span>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    min={startDate || undefined}
                    placeholder={t('composer.pickDate', { defaultValue: 'Pick a date' })}
                  />
                  <TimePicker value={endTime} onChange={setEndTime} placeholder={t('composer.time', { defaultValue: 'Time' })} />
                </div>
              </div>
            </div>
            {startInvalid && (
              <p className="mt-1.5 text-sm text-red-300">
                {t('composer.startError', { defaultValue: 'Pick when your event starts.' })}
              </p>
            )}
            {endInvalid && (
              <p className="mt-1.5 text-sm text-red-300">
                {t('composer.endError', { defaultValue: 'The end time must be after the start time.' })}
              </p>
            )}

            {/* Repeats — create-only. Generates a series of independent events. */}
            {!isEdit && (
              <div className="mt-3 rounded-xl border border-white/10 px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[15px] text-white/80">
                    <Repeat className="h-4 w-4 text-white/50" /> {t('composer.repeats', { defaultValue: 'Repeats' })}
                  </span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Repeats">
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRecurrence(opt.value)}
                        aria-pressed={recurrence === opt.value}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                          recurrence === opt.value
                            ? 'border-brand-500 bg-brand-600 text-white'
                            : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {t(`composer.recurrence.${opt.value}`, { defaultValue: opt.label })}
                      </button>
                    ))}
                  </div>
                </div>
                {recurrence !== 'none' && (
                  <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                    {/* Bound the series either by a count or by an end date. */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-white/70">{t('composer.ends', { defaultValue: 'Ends' })}</span>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Series length">
                        {([
                          ['count', t('composer.forNDates', { defaultValue: 'For N dates' })],
                          ['until', t('composer.untilADate', { defaultValue: 'Until a date' })],
                        ] as const).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setRecurrenceMode(val)}
                            aria-pressed={recurrenceMode === val}
                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                              recurrenceMode === val
                                ? 'border-brand-500 bg-brand-600 text-white'
                                : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {recurrenceMode === 'count' ? (
                      <label className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/70">
                          {t('composer.occurrences', { defaultValue: 'Number of occurrences (2–52)' })}
                        </span>
                        <input
                          type="number"
                          min={2}
                          max={MAX_RECURRENCE_COUNT}
                          value={recurrenceCount}
                          onChange={(e) => {
                            const n = Math.round(Number(e.target.value) || 2)
                            setRecurrenceCount(Math.max(2, Math.min(MAX_RECURRENCE_COUNT, n)))
                          }}
                          aria-label={t('composer.occurrencesAria', { defaultValue: 'Number of occurrences' })}
                          className="w-20 rounded-lg border border-white/10 bg-transparent px-2.5 py-1.5 text-right text-sm text-white [color-scheme:dark] focus:outline-none focus:border-brand-400"
                        />
                      </label>
                    ) : (
                      <label className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm text-white/70">
                          {t('composer.repeatUntil', { defaultValue: 'Repeat until (max 52 events)' })}
                        </span>
                        <input
                          type="date"
                          min={startDate || undefined}
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          aria-label={t('composer.repeatUntilAria', { defaultValue: 'Repeat until date' })}
                          className="rounded-lg border border-white/10 bg-transparent px-2.5 py-1.5 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-brand-400"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle icon={Info}>{t('composer.details', { defaultValue: 'Event Details' })}</SectionTitle>
            <div className="space-y-3">
              {showDescription || description ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('composer.descPlaceholder', { defaultValue: 'Tell people what to expect…' })}
                  aria-label="Event description"
                  rows={4}
                  autoFocus={showDescription}
                  className={field}
                />
              ) : (
                <button type="button" onClick={() => setShowDescription(true)} className={rowCls}>
                  <Pencil className="h-[18px] w-[18px] text-white/50" /> {t('composer.addDescription', { defaultValue: 'Add Description' })}
                </button>
              )}

              {/* Online toggle (kept compact) */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3.5">
                <span className="flex items-center gap-2 text-[15px] text-white/80">
                  <Globe className="h-[18px] w-[18px] text-white/50" /> {t('composer.onlineEvent', { defaultValue: 'Online event' })}
                </span>
                <Toggle on={isOnline} onChange={setIsOnline} label="Online event" />
              </div>

              {!isOnline && (
                <>
                  <div className={`flex items-center gap-3 rounded-xl border px-4 ${locationInvalid ? 'border-red-400/60' : 'border-white/10'}`}>
                    <MapPin className="h-[18px] w-[18px] shrink-0 text-white/50" />
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t('composer.locationPlaceholder', { defaultValue: 'Location / address' })}
                      aria-label="Location or address"
                      className="w-full bg-transparent py-3.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 px-4">
                      <Globe className="h-[18px] w-[18px] shrink-0 text-white/50" />
                      <input
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        placeholder={t('composer.venuePlaceholder', { defaultValue: 'Venue name' })}
                        aria-label="Venue name"
                        className="w-full bg-transparent py-3.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
                      />
                    </div>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t('composer.cityPlaceholder', { defaultValue: 'City' })}
                      aria-label="City"
                      className={field}
                    />
                  </div>
                  {locationInvalid && (
                    <p className="text-sm text-red-300">
                      {t('composer.locationError', {
                        defaultValue: 'Add a venue, address, or city for in-person events.',
                      })}
                    </p>
                  )}
                </>
              )}

              {/* Category as a Posh-style row of chips */}
              <div className="rounded-xl border border-white/10 px-4 py-3.5">
                <div className="mb-2.5 flex items-center gap-2 text-[13px] font-medium text-white/50">
                  <Star className="h-4 w-4" /> {t('composer.category', { defaultValue: 'Category' })}
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
                          : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {t(`categories.${cat}`, { defaultValue: cat })}
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
                  <span className="flex items-center gap-2 text-sm text-white/70">
                    {t('composer.enableWaitlist', { defaultValue: 'Enable waitlist' })}{' '}
                    <Toggle on={enableWaitlist} onChange={setEnableWaitlist} label="Enable waitlist" />
                  </span>
                }
              >
                {t('composer.tickets', { defaultValue: 'Tickets' })}
              </SectionTitle>

              {/* Currency — HTG or USD (attendees see HTG by default) */}
              <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                <span className="label-mono text-[11px] uppercase tracking-wide text-white/70">
                  {t('composer.currency', { defaultValue: 'Currency' })}
                </span>
                <div className="flex rounded-full border border-white/10 p-0.5" role="group" aria-label="Ticket currency">
                  {allowedCurrencies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      aria-pressed={currency === c}
                      className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                        currency === c ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {tiers.map((tier, i) => (
                  <div key={tier.id} className="space-y-3 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center gap-2">
                      <input
                        value={tier.name}
                        onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                        placeholder={t('composer.tierPlaceholder', {
                          defaultValue: 'Ticket type {{n}} (e.g. General, VIP, Early Bird)',
                          n: i + 1,
                        })}
                        aria-label={`Ticket type ${i + 1} name`}
                        className={field}
                      />
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(tier.id)}
                          className="shrink-0 rounded-lg  p-2.5 text-white/40 transition-colors hover:bg-white/[0.04] hover:text-red-300"
                          aria-label={t('composer.removeTier', { defaultValue: 'Remove ticket type' })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="label-mono mb-1 block text-[10px] uppercase text-white/70">
                          {t('composer.price', { defaultValue: 'Price ({{currency}})', currency })}
                        </span>
                        <input type="number" min="0" value={tier.price} onChange={(e) => updateTier(tier.id, { price: e.target.value })} className={field} />
                      </label>
                      <label className="block">
                        <span className="label-mono mb-1 block text-[10px] uppercase text-white/70">
                          {t('composer.quantity', { defaultValue: 'Quantity' })}
                        </span>
                        <input type="number" min="0" value={tier.qty} onChange={(e) => updateTier(tier.id, { qty: e.target.value })} className={field} />
                      </label>
                    </div>
                    {/* Optional per-tier sale window. Leave blank for no bound. */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="label-mono mb-1 block text-[10px] uppercase text-white/70">
                          {t('composer.salesStart', { defaultValue: 'Sales start' })}
                        </span>
                        <input
                          type="datetime-local"
                          value={tier.salesStart || ''}
                          onChange={(e) => updateTier(tier.id, { salesStart: e.target.value })}
                          aria-label={`Ticket type ${i + 1} sales start`}
                          className={field}
                        />
                      </label>
                      <label className="block">
                        <span className="label-mono mb-1 block text-[10px] uppercase text-white/70">
                          {t('composer.salesEnd', { defaultValue: 'Sales end' })}
                        </span>
                        <input
                          type="datetime-local"
                          value={tier.salesEnd || ''}
                          min={tier.salesStart || undefined}
                          onChange={(e) => updateTier(tier.id, { salesEnd: e.target.value })}
                          aria-label={`Ticket type ${i + 1} sales end`}
                          className={field}
                        />
                      </label>
                    </div>
                    {saleWindowInvalid(tier) && (
                      <p className="text-sm text-red-300">
                        {t('composer.saleWindowError', { defaultValue: 'Sales end must be after sales start.' })}
                      </p>
                    )}
                    {/* Optional per-tier entry (validity) window — when the ticket
                        admits the holder. Leave blank to admit anytime. */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="label-mono mb-1 block text-[10px] uppercase text-white/70">
                          {t('composer.validFrom', { defaultValue: 'Valid from' })}
                        </span>
                        <input
                          type="datetime-local"
                          value={tier.validFrom || ''}
                          onChange={(e) => updateTier(tier.id, { validFrom: e.target.value })}
                          aria-label={`Ticket type ${i + 1} valid from`}
                          className={field}
                        />
                      </label>
                      <label className="block">
                        <span className="label-mono mb-1 block text-[10px] uppercase text-white/70">
                          {t('composer.validUntil', { defaultValue: 'Valid until' })}
                        </span>
                        <input
                          type="datetime-local"
                          value={tier.validUntil || ''}
                          min={tier.validFrom || undefined}
                          onChange={(e) => updateTier(tier.id, { validUntil: e.target.value })}
                          aria-label={`Ticket type ${i + 1} valid until`}
                          className={field}
                        />
                      </label>
                    </div>
                    {validityWindowInvalid(tier) && (
                      <p className="text-sm text-red-300">
                        {t('composer.validityError', { defaultValue: 'Valid until must be after valid from.' })}
                      </p>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addTier}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-transparent px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white"
                >
                  <Plus className="h-4 w-4" /> {t('composer.addTicketType', { defaultValue: 'Add ticket type' })}
                </button>
              </div>

              {/* WHO PAYS THE SERVICE FEE — only meaningful once something costs money. */}
              {isPaid && (
                <div className="mt-3 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[15px] text-white/80">
                        {t('composer.fee.passTitle', { defaultValue: 'Pass the service fee to buyers' })}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        {passFeesToBuyer
                          ? t('composer.fee.onDesc', {
                              defaultValue:
                                'Buyers pay the fee on top of your ticket price. You receive the full price you set.',
                            })
                          : t('composer.fee.offDesc', {
                              defaultValue:
                                'The fee comes out of your ticket price. Buyers pay exactly what you set, and you receive less.',
                            })}
                      </p>
                    </div>
                    <Toggle
                      on={passFeesToBuyer}
                      onChange={setPassFeesToBuyer}
                      label="Pass the service fee to buyers"
                    />
                  </div>
                  <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/50">
                    {feeExample}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Guestlist — the lineup: artists, hosts & special guests joining */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle
              icon={Users}
              right={<Toggle on={showGuestlist} onChange={setShowGuestlist} label="Show guestlist" />}
            >
              {t('composer.guestlist', { defaultValue: 'Guestlist' })}
            </SectionTitle>
            <p className="mb-3 text-sm text-white/50">
              {t('composer.guestlistHint', {
                defaultValue: 'Add the artists, hosts, DJs and special guests performing or joining your event.',
              })}
            </p>

            <div className="space-y-3 rounded-xl border border-white/10 p-4">
              {/* Existing guests */}
              {guests.length > 0 && (
                <div className="space-y-2">
                  {guests.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        {g.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-white">{g.name}</span>
                        <span className="block text-xs text-white/50">
                          {t(`composer.roles.${g.role}`, { defaultValue: g.role })}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeGuest(g.id)}
                        className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.04] hover:text-red-300"
                        aria-label={t('composer.removeGuest', { defaultValue: 'Remove {{name}}', name: g.name })}
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
                placeholder={t('composer.guestNamePlaceholder', { defaultValue: 'Artist or guest name' })}
                aria-label="Artist or guest name"
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
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {t(`composer.roles.${role}`, { defaultValue: role })}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={addGuest}
                disabled={!guestName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> {t('composer.addToGuestlist', { defaultValue: 'Add to guestlist' })}
              </button>
            </div>
          </div>

          {/* Event Features */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle icon={Star}>{t('composer.features', { defaultValue: 'Event Features' })}</SectionTitle>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-4">
              <span className="text-sm text-white/70">
                {t('composer.featuresHint', { defaultValue: 'Showcase your event’s performers, sponsors and more.' })}
              </span>
              <span className="inline-flex select-none items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                {t('composer.comingSoon', { defaultValue: 'Coming soon' })}
              </span>
            </div>
            <p className="mt-2 px-1 text-xs text-white/70">
              {t('composer.featuresNote', { defaultValue: 'Available in the editor after you create the event.' })}
            </p>
          </div>

          {/* Media rows */}
          <div className="mt-6 space-y-3">
            {/* Promo video — optional link (persisted as video_url). */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 px-4">
              <Youtube className="h-[18px] w-[18px] shrink-0 text-white/50" />
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={t('composer.promoVideoPlaceholder', { defaultValue: 'Promo video link (YouTube, Vimeo…)' })}
                aria-label="Promo video link"
                className="w-full bg-transparent py-3.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-[15px] text-white/70">
              <span className="flex items-center gap-3">
                <ImageIcon className="h-[18px] w-[18px]" /> {t('composer.imageGallery', { defaultValue: 'Image Gallery' })}
              </span>
              <span className="inline-flex select-none items-center rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                {t('composer.comingSoon', { defaultValue: 'Coming soon' })}
              </span>
            </div>
          </div>

          {/* Page Settings */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <SectionTitle icon={Settings}>{t('composer.pageSettings', { defaultValue: 'Page Settings' })}</SectionTitle>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3.5">
                <span className="text-[15px] text-white/80">{t('composer.showOnExplore', { defaultValue: 'Show on Explore' })}</span>
                <Toggle on={showOnExplore} onChange={setShowOnExplore} label="Show on Explore" />
              </div>
              <div className="rounded-xl border border-white/10 px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[15px] text-white/80">
                    <Lock className="h-4 w-4 text-white/50" /> {t('composer.passwordProtected', { defaultValue: 'Password Protected Event' })}
                  </span>
                  <Toggle on={passwordProtected} onChange={setPasswordProtected} label="Password protected event" />
                </div>
                {passwordProtected && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <input
                      type="text"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder={
                        isEdit
                          ? t('composer.accessCodePlaceholderEdit', {
                              defaultValue: 'New access code (blank keeps current)',
                            })
                          : t('composer.accessCodePlaceholderNew', {
                              defaultValue: 'Access code (min 6 characters)',
                            })
                      }
                      aria-label="Access code"
                      autoComplete="off"
                      className={`${field} ${accessCodeInvalid ? 'border-red-400/60' : ''}`}
                    />
                    {accessCodeInvalid ? (
                      <p className="mt-1.5 text-sm text-red-300">
                        {t('composer.accessCodeError', { defaultValue: 'Access codes must be at least 6 characters.' })}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-white/50">
                        {t('composer.accessCodeHint', {
                          defaultValue:
                            'Attendees must enter this code to view and buy. It’s stored hashed — we never keep the plain code.',
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT — flyer + style ===================== */}
        <div className="order-1 lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Flyer. Guests upload through the API route (storage rules
                require auth for the client SDK); the file waits under
                guest-uploads/ and is promoted to event-images/ at create
                time. Abandoned ones are cleaned up after 7 days. */}
            <ImageUpload
              variant="flyer"
              currentImage={bannerUrl}
              onImageUploaded={(url) => setBannerUrl(url)}
              endpoint={guest ? '/api/guest-upload' : undefined}
            />
            {guest && (
              <p className="-mt-1 text-center text-[11px] text-white/40">
                {t('composer.posterKept', {
                  defaultValue: 'Your poster is kept for 7 days while you finish setting up.',
                })}
              </p>
            )}

            {/* Spotify — a real song search. Falls back to the old
                paste-a-URL input when the search route has no credentials. */}
            <SpotifySongPicker value={spotifyUrl} onChange={setSpotifyUrl} />

            {/* Font + accent */}
            <div className="space-y-3 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-white/80">
                  <Type className="h-4 w-4 text-white/50" /> {t('composer.titleFont', { defaultValue: 'Title Font' })}
                </span>
                <select
                  value={titleFont}
                  onChange={(e) => setTitleFont(e.target.value as any)}
                  className="rounded-lg border border-white/10 bg-transparent px-2.5 py-1.5 text-sm text-white [color-scheme:dark] focus:outline-none"
                >
                  <option value="Default">{t('composer.fonts.Default', { defaultValue: 'Default' })}</option>
                  <option value="Serif">{t('composer.fonts.Serif', { defaultValue: 'Serif' })}</option>
                  <option value="Sans">{t('composer.fonts.Sans', { defaultValue: 'Sans' })}</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-white/80">
                  <Palette className="h-4 w-4 text-white/50" /> {t('composer.accentColor', { defaultValue: 'Accent Color' })}
                </span>
                <div className="flex items-center gap-1.5">
                  {ACCENTS.map(({ hex, name }) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setAccentColor(hex)}
                      aria-label={t(`composer.colors.${name}`, { defaultValue: name })}
                      aria-pressed={accentColor === hex}
                      title={t(`composer.colors.${name}`, { defaultValue: name })}
                      className={`h-5 w-5 rounded-full transition-transform ${accentColor === hex ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : ''}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Poster theme — pins the poster gradient ('' = Auto). */}
            <div className="space-y-3 rounded-xl border border-white/10 p-4">
              <span className="flex items-center gap-2 text-sm text-white/80">
                <Palette className="h-4 w-4 text-white/50" /> {t('composer.posterTheme', { defaultValue: 'Poster Theme' })}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setThemeKey('')}
                  aria-pressed={themeKey === ''}
                  title={t('composer.auto', { defaultValue: 'Auto' })}
                  className={`flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-all ${
                    themeKey === ''
                      ? 'border-white bg-white text-black'
                      : 'border-white/15 text-white/70 hover:text-white'
                  }`}
                >
                  {t('composer.auto', { defaultValue: 'Auto' })}
                </button>
                {POSTER_THEME_SWATCHES.map(({ key, bg }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setThemeKey(key)}
                    aria-label={key}
                    aria-pressed={themeKey === key}
                    title={key}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      themeKey === key ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : ''
                    }`}
                    style={{ backgroundImage: bg }}
                  />
                ))}
              </div>
            </div>

            {/* Series edit — apply shared field changes to every sibling. */}
            {isEdit && seriesId && (
              <label className="flex items-start gap-3 rounded-xl border border-white/10 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]">
                <input
                  type="checkbox"
                  checked={applyToSeries}
                  onChange={(e) => setApplyToSeries(e.target.checked)}
                  aria-label="Apply changes to all events in this series"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600 [color-scheme:dark]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Repeat className="h-4 w-4 text-white/50" />{' '}
                    {t('composer.applySeries', { defaultValue: 'Apply changes to all events in this series' })}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/60">
                    {t('composer.applySeriesHint', {
                      defaultValue: 'Updates every event in the series. Each keeps its own date & time.',
                    })}
                  </span>
                </span>
              </label>
            )}

            {/* Save / Create */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guest
                ? authed
                  ? t('composer.continueOrganizer', { defaultValue: 'Continue — set up your organizer profile' })
                  : t('composer.continueSignup', { defaultValue: 'Continue — sign up to publish' })
                : isEdit
                ? saving
                  ? t('composer.saving', { defaultValue: 'Saving…' })
                  : t('composer.saveChanges', { defaultValue: 'Save changes' })
                : saving
                ? t('composer.creating', { defaultValue: 'Creating…' })
                : t('composer.createEvent', { defaultValue: 'Create Event' })}
            </button>

            {isEdit ? (
              <>
                <button
                  type="button"
                  onClick={handleTogglePublish}
                  disabled={publishing || (!isPublished && paidPublishingBlocked)}
                  className={`w-full rounded-xl px-7 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    isPublished
                      ? 'border border-white/15 text-white/80 hover:bg-white/[0.04]'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {publishing
                    ? t('composer.updating', { defaultValue: 'Updating…' })
                    : isPublished
                    ? t('composer.unpublish', { defaultValue: 'Unpublish (move to draft)' })
                    : t('composer.publishEvent', { defaultValue: 'Publish event' })}
                </button>
                {!isPublished && paidPublishingBlocked ? (
                  <p className="text-center text-xs text-amber-300">
                    {t('composer.verifyToPublish', {
                      defaultValue: 'Complete identity verification to publish paid events.',
                    })}
                  </p>
                ) : (
                  <p className="text-center text-xs text-white/70">
                    {isPublished
                      ? t('composer.liveNote', { defaultValue: 'Live — visible to attendees.' })
                      : t('composer.draftNote', { defaultValue: 'Draft — only you can see this.' })}
                  </p>
                )}
              </>
            ) : guest ? (
              <>
                <p className="text-center text-xs text-white/70">
                  {t('composer.guestFreeNote', {
                    defaultValue: 'Free to set up — your draft is saved on this device, nothing is lost at sign-in.',
                  })}
                </p>
                {isPaid && (
                  <p className="text-center text-xs text-amber-300/90">
                    {t('composer.guestPaidNote', {
                      defaultValue:
                        'Paid tickets need a one-time identity verification before the event can go live — you can finish setting everything up first.',
                    })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-center text-xs text-white/70">
                {t('composer.savedPrivateNote', {
                  defaultValue: 'Saved as a private draft — publish when you’re ready.',
                })}
              </p>
            )}

            {/* A restored draft always offers a way out — without this, an
                abandoned draft (or a stranger's, on a shared device) re-fills
                the form on every visit with no visible escape. */}
            {draftRestored && !isEdit && (
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(DRAFT_KEY)
                  } catch {}
                  window.location.reload()
                }}
                className="w-full text-center text-xs text-white/45 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/80"
              >
                {t('composer.startFresh', { defaultValue: 'Not your draft? Start fresh' })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
