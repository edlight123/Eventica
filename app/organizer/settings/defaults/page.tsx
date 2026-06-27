import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import DefaultsForm from './DefaultsForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/organizer/ui';

export const dynamic = 'force-dynamic';

async function getOrganizerData(userId: string) {
  const organizerDoc = await adminDb.collection('organizers').doc(userId).get();
  return organizerDoc.exists ? organizerDoc.data() : null;
}

export default async function DefaultsSettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect('/auth/login?redirect=/organizer/settings/defaults');
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings/defaults');
  }

  const organizerData = await getOrganizerData(user.id);

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
          title="Event Defaults"
          subtitle="Set default preferences for new events you create"
        />

        {/* Defaults Form */}
        <div className="mt-8 rounded-2xl  bg-[#0a0a0a] overflow-hidden">
          <DefaultsForm 
            userId={user.id}
            initialData={{
              default_city: organizerData?.default_city || '',
              default_country: organizerData?.default_country || 'HT',
              default_timezone: organizerData?.default_timezone || 'America/Port-au-Prince',
              default_currency: organizerData?.default_currency || 'HTG',
              default_categories: organizerData?.default_categories || [],
            }}
          />
        </div>

        {/* Info Notice */}
        <div className="mt-6 p-4 bg-[#0a0a0a]  rounded-lg">
          <p className="text-sm text-white/60">
            <strong className="text-white">Note:</strong> These defaults will be pre-filled when you create a new event, but you can always change them for individual events.
          </p>
        </div>
      </div>
    </div>
  );
}
