import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { AdminOrdersClient } from '@/components/admin/orders/AdminOrdersClient'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <AdminBreadcrumbs
        items={[
          { label: 'Orders', href: '/admin/orders' }
        ]}
      />

      <div className="mt-4">
        <h1 className="font-display text-[clamp(22px,3vw,30px)] leading-[1.06] text-white">Orders Management</h1>
        <p className="text-sm text-white/50 mt-1">
          View and manage all ticket orders across events
        </p>
      </div>

      <div className="mt-6">
        <AdminOrdersClient />
      </div>
    </div>
  )
}
