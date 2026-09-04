import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getOrganizerEarningsSummary } from '@/lib/earnings'
import { getOrganizerBalance } from '@/lib/firestore/payout'
import { PageHeader } from '@/components/organizer/ui'
import EarningsView from '../earnings/EarningsView'
import Link from 'next/link'

export const revalidate = 0

export const metadata = {
  title: 'Finance | Tikèm',
  description: 'Track your event revenue and manage payouts',
}

export default async function FinancePage() {
  const { user, error } = await requireAuth()
  if (error || !user) redirect('/auth/login?redirect=/organizer/finance')

  const userDoc = await adminDb.collection('users').doc(user.id).get()
  const role = userDoc.exists ? userDoc.data()?.role : null
  if (role !== 'organizer') redirect('/organizer?redirect=/organizer/finance')

  // TWO different balances, deliberately both fetched.
  //
  // `summary` comes from the `event_earnings` collection and is the earnings
  // HISTORY — gross sales, fees, per-event breakdown.
  //
  // `balance` comes from the same function /api/organizer/request-payout
  // validates against: tickets joined to events, minus already-paid ticket ids.
  // They are separate implementations with different settlement delays, so they
  // can and do disagree — this page used to show the first number and enable
  // "Request payout" from it, while the request was judged against the second.
  // An organizer was shown 2,250.00 HTG available and got "Insufficient
  // balance" on every attempt, because the earnings doc behind that figure
  // pointed at an event no longer in their account.
  //
  // The withdrawable figure must be the one the money path honours, so the hero
  // and the button now come from `balance`.
  const [summary, balance] = await Promise.all([
    getOrganizerEarningsSummary(user.id),
    getOrganizerBalance(user.id),
  ])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <PageHeader
          eyebrow="Organizer"
          title="Finance"
          subtitle="Track your event revenue and manage payouts."
          actions={
            <Link
              href="/organizer/settings/payouts"
              className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white/[0.08] px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.14] hover:text-white"
            >
              Payout settings
            </Link>
          }
        />

        <div className="mt-8">
          <EarningsView
            summary={summary}
            organizerId={user.id}
            withdrawable={{
              available: balance.available,
              pending: balance.pending,
              currency: balance.currency,
            }}
          />
        </div>
      </div>
    </div>
  )
}
