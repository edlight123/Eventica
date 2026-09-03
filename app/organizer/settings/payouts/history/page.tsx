import { ChevronRight, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { StatusChip } from '@/components/ui/kit'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPayoutHistory } from '@/lib/firestore/payout'
import { serializeData } from '@/lib/utils/serialize'

interface PayoutHistoryItem {
  id: string
  date: string
  amount: number
  status: 'completed' | 'processing' | 'failed' | 'cancelled'
  eventCount: number
  method: string
}

function PayoutHistoryClient({ payouts }: { payouts: PayoutHistoryItem[] }) {
  const formatCurrency = (amount: number) => {
    const normalized = amount / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(normalized)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: PayoutHistoryItem['status']) => {
    const tone = {
      completed: 'success',
      processing: 'warning',
      failed: 'danger',
      cancelled: 'neutral'
    } as const

    const icons = {
      completed: CheckCircle,
      processing: Clock,
      failed: XCircle,
      cancelled: AlertCircle
    }

    const labels = {
      completed: 'Paid',
      processing: 'Processing',
      failed: 'Failed',
      cancelled: 'Cancelled'
    }

    return (
      <StatusChip tone={tone[status]} icon={icons[status]}>
        {labels[status]}
      </StatusChip>
    )
  }

  return (
    <div className="bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-white/[0.03] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
            <Link href="/organizer/settings" className="hover:text-white">
              Settings
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/organizer/settings/payouts" className="hover:text-white">
              Payouts
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">Payout History</span>
          </div>

          {/* Title */}
          <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-white mb-2">
            Payout History
          </h1>
          <p className="text-white/60">
            View all your past and pending payouts.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                    Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-white/50">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-12 h-12 text-white/50" />
                        <p>No payout history yet</p>
                        <p className="text-sm">
                          Your payouts will appear here after your events are completed.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="hover:bg-white/[0.04]"
                    >
                      <td className="px-6 py-4 text-sm text-white">
                        {formatDate(payout.date)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-white text-right">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(payout.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60">
                        {payout.eventCount} {payout.eventCount === 1 ? 'event' : 'events'}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60 capitalize">
                        {payout.method}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-white/10">
            {payouts.length === 0 ? (
              <div className="px-6 py-12 text-center text-white/50">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-12 h-12 text-white/50" />
                  <p>No payout history yet</p>
                  <p className="text-sm">
                    Your payouts will appear here after your events are completed.
                  </p>
                </div>
              </div>
            ) : (
              payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="w-full p-6 text-left hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm text-white/50">
                      {formatDate(payout.date)}
                    </div>
                    {getStatusBadge(payout.status)}
                  </div>
                  <div className="text-lg font-semibold text-white mb-2">
                    {formatCurrency(payout.amount)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <span>{payout.eventCount} {payout.eventCount === 1 ? 'event' : 'events'}</span>
                    <span>·</span>
                    <span className="capitalize">{payout.method}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-6">
          <Link
            href="/organizer/settings/payouts"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-300 hover:text-brand-300"
          >
            ← Back to Payouts
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function PayoutHistoryPage() {
  // Verify authentication
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/auth/login?redirect=/organizer/settings/payouts/history')
  }

  let authUser
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    authUser = decodedClaims
  } catch (error) {
    console.error('Error verifying session:', error)
    redirect('/auth/login?redirect=/organizer/settings/payouts/history')
  }

  // Ensure this user is an organizer (attendees should go through the upgrade flow)
  try {
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get()
    const role = userDoc.exists ? userDoc.data()?.role : null
    if (role !== 'organizer') {
      redirect('/organizer?redirect=/organizer/settings/payouts/history')
    }
  } catch (error) {
    console.error('Error checking user role:', error)
    redirect('/organizer?redirect=/organizer/settings/payouts/history')
  }

  // Fetch payout history
  const payouts = await getPayoutHistory(authUser.uid, 50)
  const serializedPayouts = serializeData(payouts)

  // Transform to expected format
  const transformedPayouts: PayoutHistoryItem[] = serializedPayouts.map((payout: any) => ({
    id: payout.id,
    date: payout.createdAt || new Date().toISOString(),
    amount: payout.amount || 0,
    status:
      payout.status === 'completed'
        ? 'completed'
        : payout.status === 'processing'
          ? 'processing'
          : payout.status === 'cancelled'
            ? 'cancelled'
            : 'failed',
    eventCount: payout.ticketIds?.length || 0,
    method: payout.method || 'bank_transfer'
  }))

  const navbarUser = {
    id: authUser.uid,
    email: authUser.email || '',
    full_name: authUser.name || authUser.email || '',
    role: 'organizer' as const,
  }

  return (
    <div className="bg-[#0a0a0a]">      <PayoutHistoryClient payouts={transformedPayouts} />    </div>
  )
}
