import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OrganizerTeamPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login?redirect=/organizer/team')

  const initial = (user.full_name || user.email || 'U').trim().charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.05] text-white">Team Members</h1>
          <p className="mt-1 text-[15px] text-white/55">
            Team members can help manage your events. Assign staff per event for check-in and scanning.
          </p>
        </div>
        <Link
          href="/organizer/settings/team"
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-white/90"
        >
          <UserPlus className="h-4 w-4" /> Add team member
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Owner card */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white">
            {initial}
          </div>
          <p className="mt-4 text-[15px] font-semibold text-white">{user.full_name || 'You'}</p>
          <p className="mt-0.5 text-sm text-white/50">Owner</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#141414] p-5">
        <p className="text-sm text-white/60">
          Need to give someone door / check-in access for a specific event?{' '}
          <Link href="/organizer/settings/team" className="font-semibold text-brand-300 hover:text-brand-200">
            Manage event staff
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
