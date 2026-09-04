'use client'

/**
 * /connections — the friends surface, rebuilt to the POSH direction.
 *
 * What this was: a bold-sans `<h1>` with a teal Users icon glued to it, three
 * equal tab buttons in a `p-1 rounded-xl` track that had no fill (so the
 * padding wrapped nothing), a red filled pill for the pending count, and every
 * list rendered as `bg-white/[0.03]` behind `border border-white/10` — the
 * wireframe-of-itself failure the design brief exists to stop. Both text
 * inputs had had their background classes stripped at some point and rendered
 * as invisible fields (`py-3 rounded-xl  focus:ring-2`, note the double
 * space). The contact-match card carried a hand-rolled `font-bold` h2, a teal
 * primary button (teal is semantic-only, never a button fill), a
 * `border-2 border-white/10` secondary with no fill at all, and an empty
 * 40×40 box holding an icon.
 *
 * What it is now, per docs/POSH_DESIGN_BRIEF.md:
 * - the shared EditorialHeader (serif page title) + the shared SectionHeader
 *   (Instrument Serif, lowercased) for every in-page section. No hand-rolled
 *   headings.
 * - surfaces get a FILL: lists and cards are `bg-white/[0.03]` with no border,
 *   fields are `bg-white/[0.055]`, the disclosed manual panel is an inset.
 *   The only borders left are the tablist rule, the row dividers and the
 *   divider above the contact results — places where a hairline IS the meaning.
 * - the pending count is an amber dot + numeral ("action needed" in the locked
 *   §2.7 colour map), not a filled red pill.
 * - teal appears exactly twice: the active tab underline, and the verified
 *   check on a name. The primary action is a white pill.
 * - the incoming-request row stacks its Accept/Decline pair onto its own line
 *   under 640px, so a 402px phone never crams two buttons against a name.
 *
 * Behaviour is untouched: same props, same endpoints, same debounce, same
 * optimistic ConnectButton state, same silent-failure paths.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Inbox, Loader2, Phone, Search, UserPlus, Users } from 'lucide-react'
import ConnectButton from '@/components/connections/ConnectButton'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import { SectionHeader } from '@/components/ui/EditorialRails'
import { EmptyState } from '@/components/ui/kit'
import type { PublicUserSummary, FriendshipState } from '@/types/social'

interface Overview {
  friends: PublicUserSummary[]
  incoming: PublicUserSummary[]
  outgoing: PublicUserSummary[]
}

interface SearchResult extends PublicUserSummary {
  friendship: FriendshipState
}

type Tab = 'friends' | 'requests' | 'find'

/** The one pure-white surface on the page: the primary action. */
const PILL_PRIMARY =
  'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50'

/** Secondary action — a filled grey pill, never an outline around nothing. */
const PILL_SECONDARY =
  'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-white/[0.055] px-4 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white disabled:opacity-50'

/** A step up from secondary, for a submit that is not the screen's primary. */
const PILL_STRONG =
  'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-white/[0.14] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.2] disabled:opacity-50'

const FIELD =
  'w-full rounded-xl bg-white/[0.055] text-white placeholder:text-white/30 transition-colors focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-brand-400/60'

function Avatar({ user, size = 44 }: { user: PublicUserSummary; size?: number }) {
  const initial = (user.displayName || 'U').charAt(0).toUpperCase()
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] font-grotesk font-bold text-white/60"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {user.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  )
}

/**
 * A filled list surface with hairline-divided rows. The fill is what makes it
 * a surface; the dividers are the only legitimate borders here.
 */
function PeopleList({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-white/[0.03] px-3 sm:px-4">
      {children}
    </div>
  )
}

function PersonRow({
  user,
  isAuthenticated,
  state,
  onChange,
}: {
  user: PublicUserSummary
  isAuthenticated: boolean
  state: FriendshipState
  onChange?: (s: FriendshipState) => void
}) {
  const href = `/profile/organizer/${user.uid}`
  // An incoming request renders two buttons (Accept + Decline). Against a name
  // on a 402px phone that leaves ~150px for the name, so the pair drops to its
  // own line under sm and returns inline above it. One ConnectButton instance
  // either way — duplicating it would fork the optimistic state.
  const stackActions = state === 'request_received'

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2.5 ${stackActions ? 'py-3' : 'py-2.5'}`}>
      <Link href={href} className="shrink-0" aria-label={user.displayName} tabIndex={-1}>
        <Avatar user={user} />
      </Link>

      <Link href={href} className="min-w-0 flex-1 basis-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold tracking-tight text-white decoration-white/30 underline-offset-4 hover:underline">
            {user.displayName}
          </span>
          {user.isVerified && (
            <>
              <BadgeCheck className="h-4 w-4 shrink-0 text-brand-400" aria-hidden />
              <span className="sr-only">Verified</span>
            </>
          )}
        </span>
      </Link>

      <div className={stackActions ? 'w-full pl-14 sm:w-auto sm:shrink-0 sm:pl-0' : 'shrink-0'}>
        <ConnectButton
          targetUserId={user.uid}
          initialState={state}
          isAuthenticated={isAuthenticated}
          size="sm"
          onChange={onChange}
        />
      </div>
    </div>
  )
}

export default function ConnectionsClient({ initialOverview }: { initialOverview: Overview }) {
  const [tab, setTab] = useState<Tab>('friends')
  const [overview, setOverview] = useState<Overview>(initialOverview)

  const refreshOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/connections', { cache: 'no-store' })
      if (res.ok) setOverview(await res.json())
    } catch {
      /* ignore */
    }
  }, [])

  const pendingCount = overview.incoming.length
  const goFind = useCallback(() => setTab('find'), [])

  return (
    <div>
      <EditorialHeader
        tone="dark"
        eyebrow="Connections"
        title="Friends"
        subtitle="Connect with people and see which friends are going to events."
      />

      {/* The tablist rule is a section divider — the one hairline this band earns.
          -mx-4 lets it span the page gutter on a phone; overflow-x-auto keeps any
          future label from pushing the body sideways. */}
      <div
        role="tablist"
        aria-label="Connections"
        className="-mx-4 mb-6 mt-6 flex gap-5 overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:mb-7 sm:mt-7 sm:gap-7 sm:px-0"
      >
        <TabButton id="friends" active={tab === 'friends'} onClick={() => setTab('friends')} label="Friends">
          <Count value={overview.friends.length} />
        </TabButton>
        <TabButton id="requests" active={tab === 'requests'} onClick={() => setTab('requests')} label="Requests">
          <Count value={pendingCount} attention />
        </TabButton>
        <TabButton id="find" active={tab === 'find'} onClick={() => setTab('find')} label="Find friends" />
      </div>

      <div role="tabpanel" id="panel-friends" aria-labelledby="tab-friends" hidden={tab !== 'friends'}>
        {tab === 'friends' && <FriendsTab overview={overview} onChange={refreshOverview} onFind={goFind} />}
      </div>
      <div role="tabpanel" id="panel-requests" aria-labelledby="tab-requests" hidden={tab !== 'requests'}>
        {tab === 'requests' && <RequestsTab overview={overview} onChange={refreshOverview} />}
      </div>
      <div role="tabpanel" id="panel-find" aria-labelledby="tab-find" hidden={tab !== 'find'}>
        {tab === 'find' && <FindTab onChange={refreshOverview} />}
      </div>
    </div>
  )
}

/**
 * A tab is a label with a teal underline when active — one of the sanctioned
 * semantic uses of teal (§1). No filled track, so nothing frames empty space.
 */
function TabButton({
  id,
  active,
  onClick,
  label,
  children,
}: {
  id: Tab
  active: boolean
  onClick: () => void
  label: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onClick}
      className={`relative -mb-px shrink-0 whitespace-nowrap pb-3 pt-1 text-[13px] font-semibold tracking-tight transition-colors ${
        active ? 'text-white' : 'text-white/45 hover:text-white/75'
      }`}
    >
      <span className="inline-flex items-baseline gap-1.5">
        {label}
        {children}
      </span>
      <span
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-brand-400 transition-opacity ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  )
}

/**
 * A count beside a tab label. `attention` is a pending inbox: an amber dot plus
 * the numeral, per the locked status-colour map (amber = action needed). It
 * replaces a `bg-red-500` filled pill — a status is a dot and a label, never a
 * fill that reads as a button.
 */
function Count({ value, attention }: { value: number; attention?: boolean }) {
  if (value <= 0) return null
  return (
    <span
      className={`label-mono inline-flex items-center gap-1 text-[11px] ${
        attention ? 'text-amber-300' : 'text-white/35'
      }`}
    >
      {attention && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
      {value}
    </span>
  )
}

function FriendsTab({
  overview,
  onChange,
  onFind,
}: {
  overview: Overview
  onChange: () => void
  onFind: () => void
}) {
  if (overview.friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No friends yet"
        description="Find friends from your contacts, or search for someone by name."
        action={
          <button type="button" onClick={onFind} className={PILL_PRIMARY}>
            <UserPlus className="h-4 w-4" />
            Find friends
          </button>
        }
      />
    )
  }
  return (
    <PeopleList>
      {overview.friends.map((f) => (
        <PersonRow key={f.uid} user={f} isAuthenticated state="friends" onChange={onChange} />
      ))}
    </PeopleList>
  )
}

function RequestsTab({ overview, onChange }: { overview: Overview; onChange: () => void }) {
  const { incoming, outgoing } = overview
  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No pending requests"
        description="Friend requests you send or receive will appear here."
      />
    )
  }
  return (
    <div className="space-y-8">
      {incoming.length > 0 && (
        <section>
          <SectionHeader eyebrow={`${incoming.length} waiting`} title="received" />
          <PeopleList>
            {incoming.map((u) => (
              <PersonRow key={u.uid} user={u} isAuthenticated state="request_received" onChange={onChange} />
            ))}
          </PeopleList>
        </section>
      )}
      {outgoing.length > 0 && (
        <section>
          <SectionHeader eyebrow={`${outgoing.length} sent`} title="sent" />
          <PeopleList>
            {outgoing.map((u) => (
              <PersonRow key={u.uid} user={u} isAuthenticated state="request_sent" onChange={onChange} />
            ))}
          </PeopleList>
        </section>
      )}
    </div>
  )
}

function FindTab({ onChange }: { onChange: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Contact matching state
  const [contactMatches, setContactMatches] = useState<SearchResult[] | null>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualText, setManualText] = useState('')

  const supportsContactPicker = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return Boolean((navigator as any).contacts?.select)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, runSearch])

  const submitPhones = useCallback(async (phones: string[]) => {
    setContactLoading(true)
    setContactError(null)
    try {
      const res = await fetch('/api/connections/match-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones }),
      })
      const data = await res.json()
      setContactMatches(data.matches || [])
    } catch {
      setContactError('Could not match contacts. Please try again.')
      setContactMatches([])
    } finally {
      setContactLoading(false)
    }
  }, [])

  const syncContacts = useCallback(async () => {
    try {
      const contacts = await (navigator as any).contacts.select(['tel'], { multiple: true })
      const phones: string[] = contacts.flatMap((c: any) => c.tel || [])
      if (phones.length === 0) {
        setContactError('No phone numbers found in the selected contacts.')
        return
      }
      await submitPhones(phones)
    } catch (e) {
      // User cancelled or API unavailable.
      setManualOpen(true)
    }
  }, [submitPhones])

  const submitManual = useCallback(() => {
    const phones = manualText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (phones.length === 0) {
      setContactError('Please enter at least one phone number.')
      return
    }
    submitPhones(phones)
  }, [manualText, submitPhones])

  // Without the Contact Picker (every desktop browser, and iOS Safari) the
  // paste-a-list path is the only path, so its submit is the screen's one white
  // pill. Where Sync exists, Sync is primary and this steps down a rung.
  const manualIsPrimary = !supportsContactPicker
  const showsNoResults = query.trim().length >= 2 && !searching && results.length === 0

  return (
    <div className="space-y-8">
      <section>
        <label htmlFor="connections-search" className="sr-only">
          Search people by name or email
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40"
          />
          <input
            id="connections-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className={`${FIELD} py-3 pl-11 pr-11`}
          />
          {searching && (
            <Loader2 className="absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 animate-spin text-white/40" />
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-3">
            <PeopleList>
              {results.map((r) => (
                <PersonRow key={r.uid} user={r} isAuthenticated state={r.friendship} onChange={onChange} />
              ))}
            </PeopleList>
          </div>
        )}
        {showsNoResults && (
          <p className="mt-4 text-center !text-[13px] text-white/45">No people found for “{query}”.</p>
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Contact match"
          title="from your contacts"
          description="We only match numbers you already have. Your contacts are never stored."
        />

        <div className="rounded-2xl bg-white/[0.03] p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {supportsContactPicker && (
              <button onClick={syncContacts} disabled={contactLoading} className={PILL_PRIMARY}>
                {contactLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Sync contacts
              </button>
            )}
            <button
              onClick={() => setManualOpen((v) => !v)}
              aria-expanded={manualOpen}
              className={PILL_SECONDARY}
            >
              <Phone className="h-4 w-4" />
              {supportsContactPicker ? 'Enter numbers manually' : 'Paste phone numbers'}
            </button>
          </div>

          {/* No inset wrapper on the disclosed panel: an extra 0.04 surface
              between the 0.03 card and the 0.055 field would leave two of the
              three rungs a hair apart and read as noise. The field's own fill
              is the grouping. */}
          {manualOpen && (
            <div className="mt-3">
              <label htmlFor="connections-phones" className="sr-only">
                Phone numbers, one per line
              </label>
              <textarea
                id="connections-phones"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={4}
                placeholder={'Paste phone numbers, one per line\n+509 1234 5678\n...'}
                className={`${FIELD} resize-none px-3 py-2.5`}
              />
              <button
                onClick={submitManual}
                disabled={contactLoading}
                className={`mt-2.5 ${manualIsPrimary ? PILL_PRIMARY : PILL_STRONG}`}
              >
                {contactLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Find matches
              </button>
            </div>
          )}

          {contactError && <p className="mt-3 !text-[13px] text-red-300">{contactError}</p>}

          {contactMatches !== null && (
            <div className="mt-4 border-t border-white/[0.08] pt-3">
              {contactMatches.length === 0 ? (
                <p className="py-2 text-center !text-[13px] text-white/45">
                  None of your contacts are on Tikèm yet, invite them!
                </p>
              ) : (
                <>
                  {/* A div, not a p: `.mobile-typography p` would drag .eyebrow back to 14px. */}
                  <div className="eyebrow mb-1.5 text-white/40">{contactMatches.length} on Tikèm</div>
                  <div className="divide-y divide-white/[0.06]">
                    {contactMatches.map((m) => (
                      <PersonRow
                        key={m.uid}
                        user={m}
                        isAuthenticated
                        state={m.friendship}
                        onChange={onChange}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
