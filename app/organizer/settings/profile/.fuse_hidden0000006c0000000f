import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import ProfileForm from './ProfileForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/kit';
import { EditorialHeader } from '@/components/ui/EditorialHeader';

export const dynamic = 'force-dynamic';

async function getUserProfile(userId: string) {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  return userDoc.exists ? userDoc.data() : null;
}

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect('/auth/login?redirect=/organizer/settings/profile');
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings/profile');
  }

  const userProfile = await getUserProfile(user.id);

  if (!userProfile) {
    redirect('/');
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

        <EditorialHeader
          eyebrow="Settings"
          title="Profile Settings"
          subtitle="Manage your personal information and contact details"
          className="mb-8"
        />

        {/* Profile Form */}
        <Card>
          <ProfileForm 
            userId={user.id}
            initialData={{
              full_name: userProfile.full_name || '',
              email: userProfile.email || user.email || '',
              phone_number: userProfile.phone_number || '',
              photo_url: userProfile.photo_url || user.photo_url || '',
            }}
          />
        </Card>

        {/* Info Notice */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong className="text-gray-900">Note:</strong> Your email address is managed through your authentication provider and cannot be changed here. Contact support if you need to update your email.
          </p>
        </div>
      </div>
    </div>
  );
}
