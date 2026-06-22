import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DangerZone from './DangerZone';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DangerZoneSettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect('/auth/login?redirect=/organizer/settings/danger-zone');
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings/danger-zone');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          href="/organizer/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">Danger Zone</h1>
          </div>
          <p className="text-gray-600">
            Permanent actions that cannot be easily undone
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Proceed with Caution</h3>
              <p className="text-sm text-red-800">
                The actions below are irreversible or have significant consequences. Please read each option carefully before proceeding.
              </p>
            </div>
          </div>
        </div>

        {/* Danger Zone Actions */}
        <DangerZone userId={user.id} />
      </div>
    </div>
  );
}
