import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Users } from 'lucide-react'
import { PageHeader, OrgEmptyState } from '@/components/organizer/ui'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OrganizerTeamPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login?redirect=/organizer/team')

  const initial = (user.full_name || user.email || 'U').trim().charAt(0).toUpperCase()
  const displayName = user.full_name || user.email || 'You'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 md:py-10">
      <PageHeader
        eyebrow="Organization"
        title="Team Members"
        subtitle="Team members can help manage your events. Assign staff per event for check-in and scanning."
        actions={
          <Link
            href="/organizer/settings/team"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <UserPlus className="h-4 w-4" />
            Add team member
          </Link>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Owner card */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-display text-2xl font-bold text-white">
            {initial}
          </div>
          <p className="mt-4 text-[15px] font-semibold text-white">{displayName}</p>
          <p className="mt-0.5 text-sm text-white/50">Owner</p>
          <span className="mt-3 inline-block rounded-full bg-brand-500/15 px-3 py-1 text-[11px] font-semibold text-brand-300">
            Admin
          </span>
        </div>
      </div>

      <div className="mt-8">
        <OrgEmptyState
          icon={Users}
          title="Invite teammates"
          description="Give staff check-in or management access. Assign them to specific events from each event's Staff tab."
          action={
            <Link
              href="/organizer/settings/team"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <UserPlus className="h-4 w-4" />
              Add team member
            </Link>
          }
        />
      </div>
    </div>
  )
}
