'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { StatTile, EmptyState, StatusChip } from '@/components/ui/kit'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import { Users, UserCheck, BadgeCheck } from 'lucide-react'

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
      header: 'User',
      render: (u) => (
        <div className="min-w-0">
          <Link
            href={`/admin/users/${u.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium text-brand-300 hover:text-brand-300 truncate block"
          >
            {u.full_name || 'No name'}
          </Link>
          <div className="text-[13px] text-white/50 truncate">{u.email}</div>
          <Link
            href={`/admin/organizers/${u.id}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-block text-[13px] font-medium text-brand-300 hover:text-brand-300"
          >
            {t('users.open_organizer_admin')}
          </Link>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-500/10 text-brand-300">
          {u.role || 'organizer'}
        </span>
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
        <span className="text-[13px] text-white/50 whitespace-nowrap">
          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
  ]

  const renderOrganizerMobileCard = (u: any) => (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <Link
            href={`/admin/users/${u.id}`}
            className="text-sm font-medium text-brand-300 hover:text-brand-300 truncate block"
          >
            {u.full_name || 'No name'}
          </Link>
          <div className="text-[13px] text-white/50 truncate">{u.email}</div>
          <Link
            href={`/admin/organizers/${u.id}`}
            className="mt-1 inline-block text-[13px] font-medium text-brand-300 hover:text-brand-300"
          >
            {t('users.open_organizer_admin')}
          </Link>
        </div>
        <div>
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-500/10 text-brand-300">
            {u.role || 'organizer'}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>{renderVerification(u)}</div>
        <div className="text-[13px] text-white/50">
          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      <div className="mb-3 sm:mb-4">
        <Link href="/admin" className="text-brand-300 hover:text-brand-300 text-[13px] sm:text-sm font-medium">
          {t('users.back_to_dashboard')}
        </Link>
      </div>

      <EditorialHeader
        eyebrow="Platform"
        title={t('organizers.title')}
        subtitle={t('organizers.subtitle')}
        className="mb-4 sm:mb-5"
      />

      <div className="flex overflow-x-auto gap-3 sm:gap-4 mb-4 sm:mb-5 pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 scrollbar-hide">
        <div className="min-w-[180px] snap-start flex-shrink-0">
          <StatTile icon={Users} label={t('users.total_users')} value={counts.total} />
        </div>
        <div className="min-w-[180px] snap-start flex-shrink-0">
          <StatTile icon={UserCheck} label={t('users.organizers')} value={counts.organizers} />
        </div>
        <div className="min-w-[180px] snap-start flex-shrink-0">
          <StatTile icon={BadgeCheck} label={t('users.verified_organizers')} value={counts.verified} />
        </div>
      </div>

      <DataTable<any>
        columns={columns}
        rows={users}
        rowKey={(u) => String(u?.id || '')}
        pageSize={25}
        renderMobileCard={renderOrganizerMobileCard}
        empty={
          <EmptyState
            icon={Users}
            title={t('organizers.no_organizers_found')}
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
                ? 'bg-[#1c1c1c] text-white/50 cursor-not-allowed'
                : 'bg-[#141414] hover:bg-[#0a0a0a] text-white'
            }`}
          >
            {isLoadingMore ? t('users.loading') : t('users.load_more')}
          </button>
        </div>
      )}
    </div>
  )
}
