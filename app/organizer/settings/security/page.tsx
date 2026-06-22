import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import SecurityForm from './SecurityForm';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { EditorialHeader } from '@/components/ui/EditorialHeader';

export const dynamic = 'force-dynamic';

async function getLoginHistory(userId: string) {
  const loginSnapshot = await adminDb
    .collection('organizers')
    .doc(userId)
    .collection('loginHistory')
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get();

  return loginSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect('/auth/login?redirect=/organizer/settings/security');
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings/security');
  }

  const loginHistory = await getLoginHistory(user.id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
          title="Security"
          subtitle="Manage your password and monitor account activity"
          className="mb-8"
        />

        {/* Security Form */}
        <SecurityForm 
          userId={user.id}
          loginHistory={loginHistory}
        />
      </div>
    </div>
  );
}
