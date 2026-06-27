import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CalendarDays, ShieldCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/firebase-db/server'
import EventStaffHub from './EventStaffHub'
import { PageHeader } from '@/components/organizer/ui'

export const revalidate = 0

type OrganizerEvent = {
  id: string
  title?: string
  start_datetime?: string
  city?: string
  is_published?: boolean
  is_cancelled?: boolean
  organizer_id?: string
}

async function getOrganizerEvents(organizerId: string): Promise<OrganizerEvent[]> {
  const supabase = await createClient()
  const res = await supabase
    .from('events')
    .select('id,title,start_datetime,city,is_published,is_cancelled,organizer_id')
    .eq('organizer_id', organizerId)
    .limit(200)

  if ((res as any)?.error) {
    console.error('Failed to load organizer events for team settings:', (res as any).error)
  }

  const events = ((res as any)?.data as OrganizerEvent[] | null) || []
  return events.sort((a, b) => {
    const aTime = a?.start_datetime ? new Date(a.start_datetime).getTime() : 0
    const bTime = b?.start_datetime ? new Date(b.start_datetime).getTime() : 0
    return bTime - aTime
  })
}

export default async function TeamSettingsPage({
  searchParams,
}: {
  searchParams?: { eventId?: string }
}) {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect('/auth/login?redirect=/organizer/settings/team')
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings/team')
  }

  const events = await getOrganizerEvents(user.id)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Link
          href="/organizer/settings"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <PageHeader
          eyebrow="Settings"
          title="Team & Permissions"
          subtitle="Invite door staff and manage check-in access per event"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg text-brand-300 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Your Events</p>
                <p className="text-2xl font-semibold text-white">{events.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg text-brand-300 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Check-In Access</p>
                <p className="text-sm font-semibold text-white">Event-scoped</p>
              </div>
            </div>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg text-brand-300 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Staff</p>
                <p className="text-sm font-semibold text-white">Managed per event</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <EventStaffHub events={events} initialEventId={searchParams?.eventId} />
          </div>

          <div className="space-y-6">
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Guidelines</h3>
              <ul className="space-y-3 text-sm text-white/60">
                <li className="flex gap-2">
                  <span className="text-brand-300">•</span>
                  Invite staff for a specific event
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-300">•</span>
                  Use one-time invite links for quick onboarding
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-300">•</span>
                  Remove access immediately if a device is lost
                </li>
              </ul>
            </div>

            <div className="border border-brand-500/30 rounded-xl p-5">
              <h3 className="text-base font-semibold text-brand-300 mb-2">Need help?</h3>
              <p className="text-sm text-brand-300 mb-4">
                Our support team can help onboard large teams and set up access.
              </p>
              <Link
                href="mailto:support@tikem.co"
                className="inline-flex items-center text-sm font-semibold text-brand-300 hover:text-brand-300"
              >
                Contact Support →
              </Link>
            </div>
          </div>
        </div>
      </div>    </div>
  )
}
