import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOrganizerCustomers } from '@/lib/firestore/organizer'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OrganizerOrdersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login?redirect=/organizer/orders')

  const { orders } = await getOrganizerCustomers(user.id)
  return <OrdersClient orders={orders} />
}
