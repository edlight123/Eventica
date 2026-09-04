import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import OrganizationForm from './OrganizationForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/organizer/ui';

export const dynamic = 'force-dynamic';

async function getOrganizerData(userId: string) {
  const organizerDoc = await adminDb.collection('organizers').doc(userId).get();
  return organizerDoc.exists ? organizerDoc.data() : null;
}

export default async function OrganizationSettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect('/auth/login?redirect=/organizer/settings/organization');
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings/organization');
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
          title="Organization & Brand"
          subtitle="Manage your organization details and public branding"
        />

        {/* Organization Form */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-white/[0.03]">
          <OrganizationForm 
            userId={user.id}
            initialData={{
              organization_name: organizerData?.organization_name || '',
              organization_type: organizerData?.organization_type || '',
              organization_description: organizerData?.organization_description || '',
              organization_logo: organizerData?.organization_logo || '',
              website: organizerData?.website || '',
              facebook: organizerData?.social_media?.facebook || '',
              instagram: organizerData?.social_media?.instagram || '',
              twitter: organizerData?.social_media?.twitter || '',
              linkedin: organizerData?.social_media?.linkedin || '',
            }}
          />
        </div>
      </div>
    </div>
  );
}
