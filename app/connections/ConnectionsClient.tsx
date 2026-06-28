'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Users, UserPlus, Search, Phone, Loader2, Inbox, Send } from 'lucide-react'
import ConnectButton from '@/components/connections/ConnectButton'
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

function Avatar({ user, size = 44 }: { user: PublicUserSummary; size?: number }) {
  const initial = (user.displayName || 'U').charAt(0).toUpperCase()
  return (
    <div
      className="rounded-full overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {user.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
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
  return (
    <div className="flex items-center gap-3 py-3">
      <Link href={`/profile/organizer/${user.uid}`}>
        <Avatar user={user} />
      </Link>
      <Link href={`/profile/organizer/${user.uid}`} className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{user.displayName}</p>
        {user.isVerified && <p className="text-xs text-blue-600">Verified</p>}
      </Link>
      <ConnectButton
        targetUserId={user.uid}
        initialState={state}
        isAuthenticated={isAuthenticated}
        size="sm"
        onChange={onChange}
      />
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

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <Users className="w-7 h-7 text-brand-300" />
          Friends
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Connect with people and see which friends are going to events.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5">
        <TabButton active={tab === 'friends'} onClick={() => setTab('friends')}>
          Friends
          {overview.friends.length > 0 && <Count>{overview.friends.length}</Count>}
        </TabButton>
        <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>
          Requests
          {pendingCount > 0 && <Count highlight>{pendingCount}</Count>}
        </TabButton>
        <TabButton active={tab === 'find'} onClick={() => setTab('find')}>
          Find friends
        </TabButton>
      </div>

      {tab === 'friends' && (
        <FriendsTab overview={overview} onChange={refreshOverview} />
      )}
      {tab === 'requests' && (
        <RequestsTab overview={overview} onChange={refreshOverview} />
      )}
      {tab === 'find' && <FindTab onChange={refreshOverview} />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active ? 'bg-[#0a0a0a] text-brand-300 shadow-sm' : 'text-white/60 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Count({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
        highlight ? 'bg-red-500 text-white' : 'text-white/70'
      }`}
    >
      {children}
    </span>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white/40 mb-3">
        {icon}
      </div>
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-white/50 mt-1">{subtitle}</p>
    </div>
  )
}

function FriendsTab({ overview, onChange }: { overview: Overview; onChange: () => void }) {
  if (overview.friends.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-7 h-7" />}
        title="No friends yet"
        subtitle="Find friends from your contacts or by searching their name."
      />
    )
  }
  return (
    <div className="bg-[#0a0a0a] rounded-2xl shadow-sm  px-4 divide-y divide-white/10">
      {overview.friends.map((f) => (
        <PersonRow key={f.uid} user={f} isAuthenticated state="friends" onChange={onChange} />
      ))}
    </div>
  )
}

function RequestsTab({ overview, onChange }: { overview: Overview; onChange: () => void }) {
  const { incoming, outgoing } = overview
  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="w-7 h-7" />}
        title="No pending requests"
        subtitle="Friend requests you send or receive will appear here."
      />
    )
  }
  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Inbox className="w-4 h-4" /> Received
          </h2>
          <div className="bg-[#0a0a0a] rounded-2xl shadow-sm  px-4 divide-y divide-white/10">
            {incoming.map((u) => (
              <PersonRow key={u.uid} user={u} isAuthenticated state="request_received" onChange={onChange} />
            ))}
          </div>
        </div>
      )}
      {outgoing.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Send className="w-4 h-4" /> Sent
          </h2>
          <div className="bg-[#0a0a0a] rounded-2xl shadow-sm  px-4 divide-y divide-white/10">
            {outgoing.map((u) => (
              <PersonRow key={u.uid} user={u} isAuthenticated state="request_sent" onChange={onChange} />
            ))}
          </div>
        </div>
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

  return (
    <div className="space-y-6">
      {/* Search by name */}
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full pl-10 pr-4 py-3 rounded-xl  focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 animate-spin" />
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-2 bg-[#0a0a0a] rounded-2xl shadow-sm  px-4 divide-y divide-white/10">
            {results.map((r) => (
              <PersonRow key={r.uid} user={r} isAuthenticated state={r.friendship} onChange={onChange} />
            ))}
          </div>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-sm text-white/50 mt-3 text-center">No people found for “{query}”.</p>
        )}
      </div>

      {/* Contact matching */}
      <div className="bg-[#0a0a0a] rounded-2xl shadow-sm  p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-brand-300" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white">Find friends from contacts</h2>
            <p className="text-sm text-white/60 mt-0.5">
              We only match numbers you already have. Your contacts are never stored.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {supportsContactPicker && (
                <button
                  onClick={syncContacts}
                  disabled={contactLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {contactLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Sync contacts
                </button>
              )}
              <button
                onClick={() => setManualOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border-2 border-white/10 text-white/70 hover:bg-white/[0.04] transition-colors"
              >
                {supportsContactPicker ? 'Enter numbers manually' : 'Paste phone numbers'}
              </button>
            </div>

            {manualOpen && (
              <div className="mt-3">
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={4}
                  placeholder={'Paste phone numbers, one per line\n+509 1234 5678\n...'}
                  className="w-full px-3 py-2  rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm"
                />
                <button
                  onClick={submitManual}
                  disabled={contactLoading}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {contactLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Find matches
                </button>
              </div>
            )}

            {contactError && <p className="text-sm text-red-300 mt-3">{contactError}</p>}
          </div>
        </div>

        {/* Contact match results */}
        {contactMatches !== null && (
          <div className="mt-4 border-t border-white/10 pt-2">
            {contactMatches.length === 0 ? (
              <p className="text-sm text-white/50 py-3 text-center">
                None of your contacts are on Tikèm yet — invite them!
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide py-2">
                  {contactMatches.length} on Tikèm
                </p>
                {contactMatches.map((m) => (
                  <PersonRow key={m.uid} user={m} isAuthenticated state={m.friendship} onChange={onChange} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
