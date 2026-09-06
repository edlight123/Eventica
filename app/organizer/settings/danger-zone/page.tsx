import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DangerZone from './DangerZone';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { SettingsPageChrome } from '@/components/organizer/ui/SettingsPageChrome';

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
        <SettingsPageChrome titleKey="danger_zone_title" subtitleKey="danger_zone_subtitle" />

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
