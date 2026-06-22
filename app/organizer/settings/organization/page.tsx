import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import OrganizationForm from './OrganizationForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

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
          <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">Organization & Brand</h1>
          <p className="text-gray-600 mt-2">
            Manage your organization details and public branding
          </p>
        </div>

        {/* Organization Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
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
