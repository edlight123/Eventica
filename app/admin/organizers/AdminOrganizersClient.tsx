'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { StatTile, EmptyState } from '@/components/ui/kit'
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <div className="mb-4 sm:mb-6">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
          {t('users.back_to_dashboard')}
        </Link>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">{t('organizers.title')}</h1>
        <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">{t('organizers.subtitle')}</p>
      </div>

      <div className="flex overflow-x-auto gap-3 sm:gap-6 mb-6 sm:mb-8 pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 scrollbar-hide">
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

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('organizers.no_organizers_found')}
            className="border-0"
          />
        ) : (
          <>
            <div className="sm:hidden divide-y divide-gray-100">
              {users.map((u: any) => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 truncate block"
                      >
                        {u.full_name || 'No name'}
                      </Link>
                      <div className="text-[13px] text-gray-500 truncate">{u.email}</div>
                      <Link
                        href={`/admin/organizers/${u.id}`}
                        className="mt-1 inline-block text-[13px] font-medium text-brand-700 hover:text-brand-800"
                      >
                        {t('users.open_organizer_admin')}
                      </Link>
                    </div>
                    <div>
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-50 text-brand-700">
                        {u.role || 'organizer'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      {u.verification_status === 'approved' ? (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ {t('users.verified')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {u.verification_status === 'pending' ||
                          u.verification_status === 'pending_review' ||
                          u.verification_status === 'in_review'
                            ? 'Pending'
                            : 'Not Verified'}
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-gray-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="text-sm font-medium text-teal-600 hover:text-teal-700 truncate block"
                          >
                            {u.full_name || 'No name'}
                          </Link>
                          <div className="text-[13px] text-gray-500 truncate">{u.email}</div>
                          <Link
                            href={`/admin/organizers/${u.id}`}
                            className="mt-1 inline-block text-[13px] font-medium text-brand-700 hover:text-brand-800"
                          >
                            {t('users.open_organizer_admin')}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-50 text-brand-700">
                          {u.role || 'organizer'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.verification_status === 'approved' ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ✓ {t('users.verified')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {u.verification_status === 'pending' ||
                            u.verification_status === 'pending_review' ||
                            u.verification_status === 'in_review'
                              ? 'Pending'
                              : 'Not Verified'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && cursor && (
              <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-gray-300 ${
                    isLoadingMore
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  {isLoadingMore ? t('users.loading') : t('users.load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
