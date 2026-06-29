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
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4">
        <Link
          href="/admin/users"
          className="text-sm font-medium text-white/50 hover:text-white"
        >
          {t('users.back_to_users')}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(22px,3vw,30px)] leading-[1.06] text-white truncate">
            {user.full_name || user.name || 'No name'}
          </h1>
          <div className="mt-1 text-sm text-white/50 truncate">{user.email || ''}</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
            <span className="text-brand-300">{user.role || 'attendee'}</span>
            {user.is_verified && (
              <span className="text-emerald-300">{t('users.verified')}</span>
            )}
            {isOrganizer && (
              <Link
                href={`/admin/organizers/${id}`}
                className="text-brand-300 hover:text-white"
              >
                {t('users.open_organizer_admin')}
              </Link>
            )}
          </div>
          <div className="mt-3 text-xs text-white/40 font-mono break-all">
            {t('users.user_id')}: {id}
          </div>
        </div>

        {showPromoteToOrganizer && (
          <form action={promoteToOrganizer}>
            <input type="hidden" name="userId" value={id} />
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {t('users.promote_to_organizer')}
            </button>
          </form>
        )}
      </div>

      {/* Attendee stats strip */}
      <div className="mb-6 grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10">
        <div className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-white/40">{t('users.events_attended')}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-white">{attendeeStats.eventsAttended}</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-white/40">{t('users.tickets_confirmed')}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-white">{attendeeStats.ticketsConfirmed}</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-white/40">{t('users.tickets_checked_in')}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-white">{attendeeStats.ticketsCheckedIn}</div>
        </div>
      </div>

      {/* Organizer section */}
      {isOrganizer && organizerStats && (
        <div className="rounded-lg border border-white/10 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-lg text-white">{t('users.organizer_section')}</h2>
            <Link
              href={`/admin/organizers/${id}`}
              className="text-sm font-medium text-brand-300 hover:text-white"
            >
              {t('users.open_organizer_admin')}
            </Link>
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10">
            <div className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-white/40">{t('users.organizer_total_events')}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-white">{organizerStats.totalEvents}</div>
            </div>
            <div className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-white/40">{t('users.organizer_published_events')}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-white">{organizerStats.publishedEvents}</div>
            </div>
            <div className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-white/40">{t('users.organizer_tickets_sold')}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-white">{organizerStats.ticketsSold}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
