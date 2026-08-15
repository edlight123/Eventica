import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { AdminOrdersClient } from '@/components/admin/orders/AdminOrdersClient'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

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

      {/* Shared serif title — same header component as the rest of the console.
          "Orders", not "Orders Management": the console's own nav already says
          this is where you manage things. */}
      <EditorialHeader
        title="Orders"
        subtitle="Every ticket order across all events"
        className="mt-4"
      />

      <div className="mt-6">
        <AdminOrdersClient />
      </div>
    </div>
  )
}
