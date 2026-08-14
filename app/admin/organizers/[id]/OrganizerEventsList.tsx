'use client'

import Link from 'next/link'

export type OrganizerEventRow = {
  id: string
  title: string
  city: string
  country: string
  category: string
  start_datetime: string | null
  created_at: string | null
  is_published: boolean
  rejected: boolean
  reports_count: number
  tickets_sold: number
  total_tickets: number
  currency: string | null
}

/** ISO-sliced so the server and client agree — same approach as the rest of this page. */
function formatDay(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 10)
}

type EventState = { label: string; dot: string; text: string }

function stateOf(event: OrganizerEventRow): EventState {
  if (event.rejected) return { label: 'Unpublished', dot: 'bg-red-400', text: 'text-red-300' }
  if (event.is_published) return { label: 'Published', dot: 'bg-emerald-400', text: 'text-emerald-300' }
  return { label: 'Pending', dot: 'bg-amber-400', text: 'text-amber-300' }
}

export default function OrganizerEventsList({
  events,
  totalEvents,
  truncated,
}: {
  events: OrganizerEventRow[]
  totalEvents: number
  truncated: boolean
}) {
  return (
    <div className="rounded-lg border border-white/10 p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Events
        </h2>
        {truncated && (
          <span className="text-xs text-white/50">
            Showing {events.length} of {totalEvents}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/50">This organizer hasn&rsquo;t created any events.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {events.map((event) => {
            const state = stateOf(event)
            const place = [event.city, event.country].filter(Boolean).join(', ')
            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="-mx-2 flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{event.title}</p>
                    <p className="mt-0.5 truncate text-xs text-white/50">
                      {formatDay(event.start_datetime)}
                      {place && ` · ${place}`}
                      {event.category && ` · ${event.category}`}
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="font-mono text-sm tabular-nums text-white">
                      {event.tickets_sold}
                      {event.total_tickets > 0 && (
                        <span className="text-white/40">/{event.total_tickets}</span>
                      )}
                    </div>
                    <div className="label-mono text-[10px] uppercase tracking-wide text-white/40">Sold</div>
                  </div>

                  <div className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${state.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} aria-hidden="true" />
                    <span className="hidden sm:inline">{state.label}</span>
                  </div>

                  {event.reports_count > 0 && (
                    <span className="shrink-0 text-xs font-semibold text-amber-300" title={`${event.reports_count} report(s)`}>
                      ⚑ {event.reports_count}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {truncated && (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <Link href="/admin/events" className="text-sm font-medium text-brand-300 hover:text-brand-200">
            Open the events console →
          </Link>
        </div>
      )}
    </div>
  )
}
