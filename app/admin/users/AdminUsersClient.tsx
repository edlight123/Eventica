'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatTile } from '@/components/ui/kit'
import { Users as UsersIcon, UserCog, ShieldCheck } from 'lucide-react'

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="mb-4 sm:mb-6">
        <Link href="/admin" className="text-brand-600 hover:text-brand-700 text-[13px] sm:text-sm font-medium">
          {t('users.back_to_dashboard')}
        </Link>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">{t('users.title')}</h1>
        <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">{t('users.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatTile icon={UsersIcon} label={t('users.total_users')} value={counts.total} />
        <StatTile icon={UserCog} label={t('users.organizers')} value={counts.organizers} />
        <StatTile icon={ShieldCheck} label={t('users.verified_organizers')} value={counts.verified} />
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="relative">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (results.length || searchError) setIsOpen(true)
              }}
              onBlur={() => {
                // Delay closing so clicks on suggestions register.
                setTimeout(() => setIsOpen(false), 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results.length > 0) {
                  e.preventDefault()
                  navigateToUser(String(results[0]?.id || ''))
                }
              }}
              placeholder={t('users.search_users')}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => runSearch(query)}
              disabled={isSearching || normalizedQuery.length < 2}
              className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
            >
              {isSearching ? t('users.loading') : t('users.search')}
            </button>
          </div>

          {isOpen && (results.length > 0 || searchError) && (
            <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
              {searchError ? (
                <div className="p-3 text-sm text-red-600">{searchError}</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {results.map((r: any) => (
                    <button
                      key={`${r.type}_${r.id}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        navigateToUser(String(r.id || ''))
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                      {r.subtitle && <div className="text-[13px] text-gray-500 truncate">{r.subtitle}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">{t('users.search_hint')}</div>
      </div>
    </div>
  )
}
