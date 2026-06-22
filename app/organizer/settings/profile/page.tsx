import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import ProfileForm from './ProfileForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

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

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your personal information and contact details
          </p>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <ProfileForm 
            userId={user.id}
            initialData={{
              full_name: userProfile.full_name || '',
              email: userProfile.email || user.email || '',
              phone_number: userProfile.phone_number || '',
              photo_url: userProfile.photo_url || user.photo_url || '',
            }}
          />
        </div>

        {/* Info Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your email address is managed through your authentication provider and cannot be changed here. Contact support if you need to update your email.
          </p>
        </div>
      </div>
    </div>
  );
}
