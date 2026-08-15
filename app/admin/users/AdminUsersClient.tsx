'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { EmptyState, StatusChip } from '@/components/ui/kit'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatTriplet, type StatItem } from '@/components/ui/StatTriplet'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import { Users as UsersIcon, UserCog, ShieldCheck, Search, ArrowUpRight } from 'lucide-react'

type AdminUsersClientProps = {
  counts: {
    total: number
    organizers: number
    verified: number
  }
  initialUsers: any[]
  initialHasMore?: boolean
  initialCursor?: string | null
}

function roleTone(role: string): 'success' | 'warning' | 'neutral' {
  if (role === 'admin') return 'warning'
  if (role === 'organizer') return 'success'
  return 'neutral'
}

export default function AdminUsersClient({
  counts,
  initialUsers,
  initialHasMore = false,
  initialCursor = null,
}: AdminUsersClientProps) {
  const { t } = useTranslation('admin')

  const [users, setUsers] = useState<any[]>(initialUsers)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!normalizedQuery) return users
    return users.filter(
      (u) =>
        String(u.full_name || '').toLowerCase().includes(normalizedQuery) ||
        String(u.email || '').toLowerCase().includes(normalizedQuery),
    )
  }, [users, normalizedQuery])

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !cursor) return
    setIsLoadingMore(true)
    setLoadError(null)
    try {
      const url = new URL('/api/admin/users', window.location.origin)
      url.searchParams.set('limit', '200')
      url.searchParams.set('cursor', cursor)

      const res = await fetch(url.toString(), { method: 'GET' })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Failed to load more users (${res.status})`)
      }

      const data = await res.json()
      const nextUsers = Array.isArray(data?.users) ? data.users : []
      const nextCursor = typeof data?.nextCursor === 'string' ? data.nextCursor : null
      const nextHasMore = Boolean(data?.hasMore)

      setUsers((prev) => {
        const seen = new Set(prev.map((u: any) => String(u?.id || '')))
        const out = [...prev]
        for (const u of nextUsers) {
          const id = String(u?.id || '')
          if (!id || seen.has(id)) continue
          seen.add(id)
          out.push(u)
        }
        return out
      })

      setCursor(nextCursor)
      setHasMore(nextHasMore && Boolean(nextCursor))
    } catch (err: any) {
      console.error('Load more users error:', err)
      setLoadError(err?.message || 'Failed to load more users')
    } finally {
      setIsLoadingMore(false)
    }
  }

  const stats: StatItem[] = [
    { icon: UsersIcon, label: t('users.total_users'), value: counts.total.toLocaleString() },
    { icon: UserCog, label: t('users.organizers'), value: counts.organizers.toLocaleString() },
    { icon: ShieldCheck, label: t('users.verified_organizers'), value: counts.verified.toLocaleString() },
  ]

  const columns: Column<any>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <Link href={`/admin/users/${u.id}`} className="group block min-w-0">
          <span className="block truncate text-sm font-medium text-white group-hover:text-brand-300">
            {u.full_name || 'No name'}
          </span>
          <span className="block truncate text-[13px] text-white/50">{u.email || 'No email'}</span>
        </Link>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <StatusChip tone={roleTone(String(u.role || 'attendee'))}>
          {String(u.role || 'attendee')}
        </StatusChip>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (u) => (
        <span className="font-mono tabular-nums text-[13px] text-white/50 whitespace-nowrap">
          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (u) => (
        <Link
          href={`/admin/users/${u.id}`}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-300 hover:text-brand-200"
        >
          View <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ]

  const renderMobileCard = (u: any) => (
    <Link href={`/admin/users/${u.id}`} className="block p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">{u.full_name || 'No name'}</span>
          <span className="block truncate text-[13px] text-white/50">{u.email || 'No email'}</span>
        </div>
        <StatusChip tone={roleTone(String(u.role || 'attendee'))}>
          {String(u.role || 'attendee')}
        </StatusChip>
      </div>
      <div className="mt-2 font-mono tabular-nums text-[13px] text-white/50">
        Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
      </div>
    </Link>
  )

  return (
    <div className="space-y-6">
      {/* Shared serif title — same header component as the rest of the console. */}
      <EditorialHeader title={t('users.title')} subtitle={t('users.subtitle')} />

      {/* Stats — divided strip */}
      <StatTriplet items={stats} columns={3} />

      {/* Search — refines the loaded list */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('users.search_users')}
          className="w-full rounded-lg border border-white/10 bg-transparent py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
          {loadError}
        </div>
      )}

      <DataTable<any>
        columns={columns}
        rows={filtered}
        rowKey={(u) => String(u?.id || '')}
        pageSize={25}
        renderMobileCard={renderMobileCard}
        empty={
          <EmptyState
            icon={UsersIcon}
            title={normalizedQuery ? 'No users match your search' : 'No users found'}
            className="border-0"
          />
        }
      />

      {hasMore && cursor && !normalizedQuery && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-white/15 ${
              isLoadingMore
                ? 'bg-[#0a0a0a] text-white/50 cursor-not-allowed'
                : 'bg-[#0a0a0a] hover:bg-white/[0.04] text-white'
            }`}
          >
            {isLoadingMore ? t('users.loading') : t('users.load_more')}
          </button>
        </div>
      )}

      <p className="text-xs text-white/50">{t('users.search_hint')}</p>
    </div>
  )
}
