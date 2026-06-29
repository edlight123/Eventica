import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import TransferAcceptForm from './TransferAcceptForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function serializeData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (obj.toDate && typeof obj.toDate === 'function') return obj.toDate().toISOString()
  if (Array.isArray(obj)) return obj.map(serializeData)

  const serialized: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      serialized[key] = serializeData(obj[key])
    }
  }
  return serialized
}

export default async function TransferAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { user, error } = await requireAuth()

  if (error || !user) {
    const { token } = await params
    redirect(`/auth/login?redirect=/tickets/transfer/${token}`)
  }

  const { token } = await params

  // Get transfer request from Firestore
  const transfersQuery = await adminDb.collection('ticket_transfers')
    .where('transfer_token', '==', token)
    .limit(1)
    .get()

  if (transfersQuery.empty) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
        <Navbar user={user} />
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <div className="bg-[#0a0a0a] rounded-xl sm:rounded-2xl border border-white/10 p-6 sm:p-8 text-center">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">❌</div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Transfer Not Found</h1>
            <p className="text-[13px] sm:text-base text-white/60 mb-4 sm:mb-6">
              This transfer link is invalid or has expired.
            </p>
            <a
              href="/tickets"
              className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-brand-600 text-white text-[15px] sm:text-base font-semibold rounded-lg hover:bg-brand-700 min-h-[44px]"
            >
              View My Tickets
            </a>
          </div>
        </div>
        <MobileNavWrapper user={user} />
      </div>
    )
  }

  const transferDoc = transfersQuery.docs[0]
  const transferData = transferDoc.data()
  const transfer = {
    id: transferDoc.id,
    ticket_id: transferData.ticket_id,
    from_user_id: transferData.from_user_id,
    to_email: transferData.to_email,
    status: transferData.status,
    transfer_token: transferData.transfer_token,
    expires_at: transferData.expires_at?.toDate?.()?.toISOString() || transferData.expires_at,
    created_at: transferData.created_at?.toDate?.()?.toISOString() || transferData.created_at,
    completed_at: transferData.completed_at?.toDate?.()?.toISOString() || transferData.completed_at
  }

  // Check if transfer has expired
  if (transfer.expires_at && new Date(transfer.expires_at) < new Date()) {
    // Update status to expired
    await adminDb.collection('ticket_transfers').doc(transfer.id).update({
      status: 'expired',
      updated_at: new Date().toISOString()
    })

    return (
      <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
        <Navbar user={user} />
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <div className="bg-[#0a0a0a] rounded-xl sm:rounded-2xl border border-white/10 p-6 sm:p-8 text-center">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">⏰</div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Transfer Expired</h1>
            <p className="text-[13px] sm:text-base text-white/60 mb-4 sm:mb-6">
              This transfer link expired on {new Date(transfer.expires_at).toLocaleString()}.
              <br />
              Transfer links are only valid for 24 hours.
            </p>
            <a
              href="/tickets"
              className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-brand-600 text-white text-[15px] sm:text-base font-semibold rounded-lg hover:bg-brand-700 min-h-[44px]"
            >
              View My Tickets
            </a>
          </div>
        </div>
        <MobileNavWrapper user={user} />
      </div>
    )
  }

  // Check if already responded to
  if (transfer.status !== 'pending') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
        <Navbar user={user} />
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <div className="bg-[#0a0a0a] rounded-xl sm:rounded-2xl border border-white/10 p-6 sm:p-8 text-center">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">
              {transfer.status === 'accepted' ? '✅' : '❌'}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Transfer {transfer.status === 'accepted' ? 'Completed' : 'Cancelled'}
            </h1>
            <p className="text-[13px] sm:text-base text-white/60 mb-4 sm:mb-6">
              This transfer has already been {transfer.status}.
            </p>
            <a
              href="/tickets"
              className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-brand-600 text-white text-[15px] sm:text-base font-semibold rounded-lg hover:bg-brand-700 min-h-[44px]"
            >
              View My Tickets
            </a>
          </div>
        </div>
        <MobileNavWrapper user={user} />
      </div>
    )
  }

  // Get ticket details
  const ticketDoc = await adminDb.collection('tickets').doc(transfer.ticket_id).get()
  
  if (!ticketDoc.exists) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
        <Navbar user={user} />
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <div className="bg-[#0a0a0a] rounded-xl sm:rounded-2xl border border-white/10 p-6 sm:p-8 text-center">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">❌</div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Ticket Not Found</h1>
            <p className="text-[13px] sm:text-base text-white/60">
              The ticket associated with this transfer no longer exists.
            </p>
          </div>
        </div>
        <MobileNavWrapper user={user} />
      </div>
    )
  }

  const ticket = ticketDoc.data()

  // Get event details
  const eventDoc = await adminDb.collection('events').doc(ticket?.event_id).get()
  const event = eventDoc.exists ? eventDoc.data() : null

  // Get sender details
  const senderDoc = await adminDb.collection('users').doc(transfer.from_user_id).get()
  const sender = senderDoc.exists ? senderDoc.data() : null

  // IMPORTANT: Firestore documents often contain Timestamp instances which cannot be
  // passed to Client Components. Serialize before passing down.
  const serializedTicket = serializeData({ id: ticketDoc.id, ...ticket })
  const serializedEvent = event ? serializeData({ id: eventDoc.id, ...event }) : null
  const serializedSender = sender ? serializeData({ id: senderDoc.id, ...sender }) : null

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
      <Navbar user={user} />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
        <TransferAcceptForm
          transfer={transfer}
          ticket={serializedTicket}
          event={serializedEvent}
          sender={serializedSender}
          currentUser={user}
        />
      </div>
      <MobileNavWrapper user={user} />
    </div>
  )
}
