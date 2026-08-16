import { PlatformSettingsForm } from './PlatformSettingsForm'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'

export const revalidate = 30

export default async function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      <AdminBreadcrumbs items={[{ label: 'Platform Settings' }]} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="label-mono text-[15px] font-bold uppercase tracking-[0.14em] text-console-text">
          Platform Settings
        </h1>
        <p className="mt-1 text-[13px] text-console-mut">
          Configure platform fees and settlement times for different regions
        </p>
      </div>

      {/* Settings Form */}
      <PlatformSettingsForm />
    </div>
  )
}
