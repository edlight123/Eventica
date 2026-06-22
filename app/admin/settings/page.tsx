import { PlatformSettingsForm } from './PlatformSettingsForm'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

export const revalidate = 30

export default async function AdminSettingsPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <AdminBreadcrumbs items={[{ label: 'Platform Settings' }]} />
        
        {/* Header */}
        <EditorialHeader
          eyebrow="Platform"
          title="Platform Settings"
          subtitle="Configure platform fees and settlement times for different regions"
          className="mb-8"
        />

        {/* Settings Form */}
        <PlatformSettingsForm />
      </div>
    </div>
  )
}
