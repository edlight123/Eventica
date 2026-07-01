'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { EmptyState, StatusChip } from '@/components/ui/kit'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import { UserCheck, BadgeCheck, Clock, Search, ArrowUpRight } from 'lucide-react'

type VerifyState = 'verified' | 'pending' | 'unverified'
function verifyState(u: any): VerifyState {
  const s = String(u?.verification_status || '').toLowerCase()
  if (s === 'approved') return 'verified'
  if (s === 'pending' || s === 'pending_review' || s === 'in_review') return 'pending'
  return 'unverified'
}

type AdminOrganizersClientProps = {
  counts: {
    total: number
    organizers: number
    verified: number
  }
  initialUsers: any[]
  initialHasMore?: boolean
  initialCursor?: string | null
}

export default function AdminOrganizersClient({
  counts,
  initialUsers,
  initialHasMore = false,
  initialCursor = null,
}: AdminOrganizersClientProps) {
  const { t } = useTranslation('admin')

  const [users, setUsers] = useState<any[]>(initialUsers)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [verifyFilter, setVerifyFilter] = useState<'all' | VerifyState>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (verifyFilter !== 'all' && verifyState(u) !== verifyFilter) return false
      if (!q) return true
      return (
        String(u.full_name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q)
      )
    })
  }, [users, query, verifyFilter])

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !cursor) return
    setIsLoadingMore(true)
    try {
      const url = new URL('/api/admin/organizers', window.location.origin)
      url.searchParams.set('limit', '200')
      url.searchParams.set('cursor', cursor)

      const res = await fetch(url.toString(), { method: 'GET' })
      if (!res.ok) {
        console.error('Failed to load more organizers:', await res.text())
        return
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
          if (!id) continue
          if (seen.has(id)) continue
          seen.add(id)
          out.push(u)
        }
        return out
      })

      setCursor(nextCursor)
      setHasMore(nextHasMore && Boolean(nextCursor))
    } catch (err) {
      console.error('Load more organizers error:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const renderVerification = (u: any) => {
    if (u.verification_status === 'approved') {
      return <StatusChip tone="success">{t('users.verified')}</StatusChip>
    }
    if (
      u.verification_status === 'pending' ||
      u.verification_status === 'pending_review' ||
      u.verification_status === 'in_review'
    ) {
      return <StatusChip tone="warning">Pending</StatusChip>
    }
    return <StatusChip tone="neutral">Not Verified</StatusChip>
  }

  const columns: Column<any>[] = [
    {
      key: 'user',
      header: 'Organizer',
      render: (u) => (
        <Link href={`/admin/organizers/${u.id}`} className="group block min-w-0">
          <span className="block truncate text-sm font-medium text-white group-hover:text-brand-300">
            {u.full_name || 'No name'}
          </span>
          <span className="block truncate text-[13px] text-white/50">{u.email}</span>
        </Link>
      ),
    },
    {
      key: 'verification',
      header: 'Verification',
      render: (u) => renderVerification(u),
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
          href={`/admin/organizers/${u.id}`}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-300 hover:text-brand-200"
        >
          Manage <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ]

  const renderOrganizerMobileCard = (u: any) => (
    <Link href={`/admin/organizers/${u.id}`} className="block p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">{u.full_name || 'No name'}</span>
          <span className="block truncate text-[13px] text-white/50">{u.email}</span>
        </div>
        {renderVerification(u)}
      </div>
      <div className="mt-2 font-mono tabular-nums text-[13px] text-white/50">
        Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
      </div>
    </Link>
  )

  const unverified = Math.max(0, counts.organizers - counts.verified)
  const stats = [
    { icon: UserCheck, label: 'Organizers', value: counts.organizers },
    { icon: BadgeCheck, label: 'Verified', value: counts.verified },
    { icon: Clock, label: 'Not verified', value: unverified },
  ]

  const filters: { key: 'all' | VerifyState; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'verified', label: 'Verified' },
    { key: 'pending', label: 'Pending' },
    { key: 'unverified', label: 'Not verified' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <EditorialHeader
        eyebrow="Platform"
        title={t('organizers.title')}
        subtitle={t('organizers.subtitle')}
        tone="dark"
        className="mb-5"
      />

      <div className="mb-5 grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="p-4">
              <div className="label-mono mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
                <Icon className="h-3.5 w-3.5 text-white/30" /> <span className="truncate">{s.label}</span>
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-white">{s.value.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      {/* Toolbar: search + verification filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-lg border border-white/10 bg-transparent py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
        <div className="flex shrink-0 gap-1 overflow-x-auto rounded-full border border-white/10 p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setVerifyFilter(f.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                verifyFilter === f.key ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable<any>
        columns={columns}
        rows={filtered}
        rowKey={(u) => String(u?.id || '')}
        pageSize={25}
        renderMobileCard={renderOrganizerMobileCard}
        empty={
          <EmptyState
            icon={UserCheck}
            title={query || verifyFilter !== 'all' ? 'No organizers match your filters' : t('organizers.no_organizers_found')}
            className="border-0"
          />
        }
      />

      {hasMore && cursor && (
        <div className="mt-4 sm:mt-6 flex justify-center">
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
    </div>
  )
}
