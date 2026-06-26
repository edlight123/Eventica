import Link from 'next/link'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { AdminOrdersClient } from '@/components/admin/orders/AdminOrdersClient'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <AdminBreadcrumbs 
        items={[
          { label: 'Orders', href: '/admin/orders' }
        ]} 
      />
      
      <div>
        <h1 className="font-display text-[clamp(22px,3vw,30px)] leading-[1.06] text-gray-900">Orders Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage all ticket orders across events
        </p>
      </div>

      <AdminOrdersClient />
    </div>
  )
}
