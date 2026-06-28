import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOrganizerCustomers } from '@/lib/firestore/organizer'
import MarketingClient from './MarketingClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OrganizerMarketingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login?redirect=/organizer/marketing')

  const { attendees } = await getOrganizerCustomers(user.id)
  return <MarketingClient attendees={attendees} />
}
