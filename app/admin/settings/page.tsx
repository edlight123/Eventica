import { PlatformSettingsForm } from './PlatformSettingsForm'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

export const revalidate = 30

export default async function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      <AdminBreadcrumbs items={[{ label: 'Platform Settings' }]} />

      {/* Header */}
      <EditorialHeader
        eyebrow="Platform"
        title="Platform Settings"
        subtitle="Configure platform fees and settlement times for different regions"
        tone="dark"
        className="mb-8"
      />

      {/* Settings Form */}
      <PlatformSettingsForm />
    </div>
  )
}
