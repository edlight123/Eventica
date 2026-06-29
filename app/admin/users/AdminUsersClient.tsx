'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { Users as UsersIcon, UserCog, ShieldCheck, Search } from 'lucide-react'

type AdminUsersClientProps = {
  counts: {
    total: number
    organizers: number
    verified: number
  }
}

export default function AdminUsersClient({
  counts,
}: AdminUsersClientProps) {
  const { t } = useTranslation('admin')
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const activeRequest = useRef<AbortController | null>(null)
  const debounceTimer = useRef<any>(null)

  const normalizedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    setSearchError(null)
  }, [query])

  const runSearch = async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      activeRequest.current?.abort()
      setResults([])
      setIsOpen(false)
      return
    }

    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller

    setIsSearching(true)
    setSearchError(null)

    try {
      const res = await fetch('/api/admin/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Search failed')
      }

      const data = await res.json()
      const all = Array.isArray(data?.results) ? data.results : []
      const usersOnly = all
        .filter((r: any) => r?.type === 'user')
        .slice(0, 10)
        .map((r: any) => ({
          ...r,
          href: r?.id ? `/admin/users/${r.id}` : r?.href,
        }))
      setResults(usersOnly)
      setIsOpen(true)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setSearchError(err?.message || 'Search failed')
      setResults([])
      setIsOpen(true)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      runSearch(normalizedQuery)
    }, 250)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedQuery])

  const navigateToUser = (userId: string) => {
    if (!userId) return
    setIsOpen(false)
    router.push(`/admin/users/${userId}`)
  }

  const stats = [
    { icon: UsersIcon, label: t('users.total_users'), value: counts.total },
    { icon: UserCog, label: t('users.organizers'), value: counts.organizers },
    { icon: ShieldCheck, label: t('users.verified_organizers'), value: counts.verified },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[clamp(24px,3vw,32px)] leading-[1.04] text-white">{t('users.title')}</h1>
        <p className="mt-1 text-sm text-white/50">{t('users.subtitle')}</p>
      </div>

      {/* Stats — divided strip */}
      <div className="grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
                <Icon className="h-3.5 w-3.5 text-white/30" /> <span className="truncate">{s.label}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-white">{s.value.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-2xl">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length || searchError) setIsOpen(true)
              }}
              onBlur={() => setTimeout(() => setIsOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results.length > 0) {
                  e.preventDefault()
                  navigateToUser(String(results[0]?.id || ''))
                }
              }}
              placeholder={t('users.search_users')}
              className="w-full rounded-lg border border-white/10 bg-transparent py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
          </div>
          <button
            type="button"
            onClick={() => runSearch(query)}
            disabled={isSearching || normalizedQuery.length < 2}
            className="shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {isSearching ? t('users.loading') : t('users.search')}
          </button>
        </div>

        {isOpen && (results.length > 0 || searchError) && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0a] shadow-xl">
            {searchError ? (
              <div className="p-3 text-sm text-red-300">{searchError}</div>
            ) : (
              <div className="divide-y divide-white/5">
                {results.map((r: any) => (
                  <button
                    key={`${r.type}_${r.id}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      navigateToUser(String(r.id || ''))
                    }}
                    className="w-full px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="truncate text-sm font-medium text-white">{r.title}</div>
                    {r.subtitle && <div className="truncate text-[13px] text-white/50">{r.subtitle}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="mt-2 text-xs text-white/40">{t('users.search_hint')}</p>
      </div>
    </div>
  )
}
