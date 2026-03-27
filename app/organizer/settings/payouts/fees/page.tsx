import { ChevronRight, Info } from 'lucide-react'
import Link from 'next/link'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PayoutFeesPage() {
  const payoutPath = '/organizer/settings/payouts/fees'

  // Verify authentication
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect(`/auth/login?redirect=${encodeURIComponent(payoutPath)}`)
  }

  let authUser
  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    authUser = decodedClaims
  } catch (error) {
    console.error('Error verifying session:', error)
    redirect(`/auth/login?redirect=${encodeURIComponent(payoutPath)}`)
  }

  // Ensure this user is an organizer (attendees should go through the upgrade flow)
  try {
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get()
    const role = userDoc.exists ? userDoc.data()?.role : null
    if (role !== 'organizer') {
      redirect(`/organizer?redirect=${encodeURIComponent(payoutPath)}`)
    }
  } catch (error) {
    console.error('Error checking user role:', error)
    redirect(`/organizer?redirect=${encodeURIComponent(payoutPath)}`)
  }

  const navbarUser = {
    id: authUser.uid,
    email: authUser.email || '',
    full_name: authUser.name || authUser.email || '',
    role: 'organizer' as const,
  }

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Link href="/organizer/settings" className="hover:text-gray-900">
              Settings
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/organizer/settings/payouts" className="hover:text-gray-900">
              Payouts
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Fees & Rules</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Fees & Rules
          </h1>
          <p className="text-gray-600">
            Understanding platform fees, processing costs, and payout schedules.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          
          {/* Platform Fee Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Platform fee
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Eventica charges a <strong>2.5% platform fee</strong> on all ticket sales.
                This helps us maintain and improve the platform, provide customer support,
                and continue developing new features.
              </p>
              <p>
                You can choose to absorb this fee yourself or pass it on to your attendees
                during ticket creation.
              </p>
            </div>
          </div>

          {/* Processing Fee Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Payment processing fee
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Payment processing fees vary by payment method:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Credit/Debit cards:</strong> 2.9% + HTG 15 per transaction
                </li>
                <li>
                  <strong>MonCash:</strong> 2.5% per transaction
                </li>
              </ul>
              <p className="text-sm text-gray-600">
                These fees are collected by our payment partners (Stripe, MonCash) and are
                deducted from your payout automatically.
              </p>
            </div>
          </div>

          {/* Payout Schedule Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Payout schedule
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Payouts are processed <strong>7 days after your event ends</strong>. This
                holding period allows time for any refund requests or payment disputes
                to be resolved.
              </p>
              <p>
                Once the holding period is complete, you can request a payout from your
                organizer dashboard. Payouts are typically processed within <strong>3-5
                business days</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <strong>Note:</strong> For free events, there are no fees charged.
                    Platform and processing fees only apply to paid ticket sales.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Calculation Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Example calculation
            </h2>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ticket price:</span>
                    <span className="text-gray-900 font-semibold">HTG 500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tickets sold:</span>
                    <span className="text-gray-900 font-semibold">× 100</span>
                  </div>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross sales:</span>
                    <span className="text-gray-900 font-semibold">HTG 50,000</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Platform fee (2.5%):</span>
                    <span>- HTG 1,250</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Processing fees (2.9% + HTG 15/tx):</span>
                    <span>- HTG 2,950</span>
                  </div>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-900 font-semibold">Net payout:</span>
                    <span className="text-green-600 font-bold">HTG 45,800</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                This is a simplified example. Actual fees may vary slightly depending on
                the payment methods used by your attendees.
              </p>
            </div>
          </div>

          {/* Refunds Note Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Refunds
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                When you issue a refund to an attendee:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  The platform fee is refunded to you (not charged)
                </li>
                <li>
                  Processing fees are <strong>not refundable</strong> as they were already
                  paid to payment processors
                </li>
                <li>
                  The refunded amount is deducted from your next payout
                </li>
              </ul>
            </div>
          </div>

          {/* Back Link */}
          <div className="pt-4">
            <Link
              href="/organizer/settings/payouts"
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              ← Back to Payouts
            </Link>
          </div>
        </div>
      </div>    </div>
  )
}
