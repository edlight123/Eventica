import { PlatformSettingsForm } from './PlatformSettingsForm'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'

export const revalidate = 30

export default async function AdminSettingsPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <AdminBreadcrumbs items={[{ label: 'Platform Settings' }]} />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">
                Platform Settings
              </h1>
              <p className="mt-2 text-gray-600">
                Configure platform fees and settlement times for different regions
              </p>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <PlatformSettingsForm />
      </div>
    </div>
  )
}
