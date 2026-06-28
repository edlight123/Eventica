'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

type AdminUserDetailsClientProps = {
  details: {
    id: string
    user: any
    attendeeStats: {
      ticketsConfirmed: number
      ticketsCheckedIn: number
      eventsAttended: number
    }
    organizerStats?: {
      totalEvents: number
      publishedEvents: number
      ticketsSold: number
    } | null
    isOrganizer: boolean
  }
  showPromoteToOrganizer: boolean
  promoteToOrganizer: (formData: FormData) => void
}

export default function AdminUserDetailsClient({
  details,
  showPromoteToOrganizer,
  promoteToOrganizer,
}: AdminUserDetailsClientProps) {
  const { t } = useTranslation('admin')

  const { id, user, attendeeStats, organizerStats, isOrganizer } = details

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      <div className="mb-3 sm:mb-4">
        <Link
          href="/admin/users"
          className="text-brand-300 hover:text-brand-300 text-[13px] sm:text-sm font-medium"
        >
          {t('users.back_to_users')}
        </Link>
      </div>

      <div className="bg-[#0a0a0a] rounded-xl sm:rounded-2xl shadow-sm  p-4 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(22px,3vw,30px)] leading-[1.06] text-white truncate">
              {user.full_name || user.name || 'No name'}
            </h1>
            <div className="text-[13px] sm:text-sm text-white/50 truncate">{user.email || ''}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-brand-300">
                {user.role || 'attendee'}
              </span>
              {user.is_verified && (
                <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-emerald-300">
                  {t('users.verified')}
                </span>
              )}
              {isOrganizer && (
                <Link
                  href={`/admin/organizers/${id}`}
                  className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-brand-300"
                >
                  {t('users.open_organizer_admin')}
                </Link>
              )}
            </div>

            <div className="mt-4 text-xs text-white/50 font-mono break-all">{t('users.user_id')}: {id}</div>
          </div>

          {showPromoteToOrganizer && (
            <form action={promoteToOrganizer}>
              <input type="hidden" name="userId" value={id} />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
              >
                {t('users.promote_to_organizer')}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0a0a0a] rounded-xl shadow-sm  p-6">
          <div className="text-sm text-white/60">{t('users.events_attended')}</div>
          <div className="text-2xl font-bold text-white">{attendeeStats.eventsAttended}</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-xl shadow-sm  p-6">
          <div className="text-sm text-white/60">{t('users.tickets_confirmed')}</div>
          <div className="text-2xl font-bold text-white">{attendeeStats.ticketsConfirmed}</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-xl shadow-sm  p-6">
          <div className="text-sm text-white/60">{t('users.tickets_checked_in')}</div>
          <div className="text-2xl font-bold text-white">{attendeeStats.ticketsCheckedIn}</div>
        </div>
      </div>

      {isOrganizer && organizerStats && (
        <div className="bg-[#0a0a0a] rounded-xl sm:rounded-2xl shadow-sm  p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-lg sm:text-xl text-white">{t('users.organizer_section')}</h2>
            <Link
              href={`/admin/organizers/${id}`}
              className="text-sm font-medium text-brand-300 hover:text-brand-300"
            >
              {t('users.open_organizer_admin')}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl  p-4">
              <div className="text-sm text-white/60">{t('users.organizer_total_events')}</div>
              <div className="text-2xl font-bold text-white">{organizerStats.totalEvents}</div>
            </div>
            <div className="rounded-xl  p-4">
              <div className="text-sm text-white/60">{t('users.organizer_published_events')}</div>
              <div className="text-2xl font-bold text-white">{organizerStats.publishedEvents}</div>
            </div>
            <div className="rounded-xl  p-4">
              <div className="text-sm text-white/60">{t('users.organizer_tickets_sold')}</div>
              <div className="text-2xl font-bold text-white">{organizerStats.ticketsSold}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
