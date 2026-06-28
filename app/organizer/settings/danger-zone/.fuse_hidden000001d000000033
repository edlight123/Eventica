import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DangerZone from './DangerZone';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/organizer/ui';

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
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          href="/organizer/settings"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <PageHeader
          eyebrow="Settings"
          title="Danger Zone"
          subtitle="Permanent actions that cannot be easily undone"
        />

        {/* Warning Banner */}
        <div className="border-2 border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-300 mb-1">Proceed with Caution</h3>
              <p className="text-sm text-red-300">
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
