import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import NotificationsForm from './NotificationsForm';
import { SettingsPageChrome } from '@/components/organizer/ui/SettingsPageChrome';

export const dynamic = 'force-dynamic';

async function getNotificationPreferences(userId: string) {
  const prefsDoc = await adminDb
    .collection('organizers')
    .doc(userId)
    .collection('notificationPreferences')
    .doc('main')
    .get();

  return prefsDoc.exists ? prefsDoc.data() : null;
}

export default async function NotificationsSettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect('/auth/login?redirect=/organizer/settings/notifications');
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings/notifications');
  }

  const preferences = await getNotificationPreferences(user.id);

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <SettingsPageChrome titleKey="notifications_title" subtitleKey="notifications_subtitle" />

        {/* Notifications Form */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-white/[0.03]">
          <NotificationsForm 
            userId={user.id}
            initialData={{
              email_ticket_sales: preferences?.email_ticket_sales ?? true,
              email_new_reviews: preferences?.email_new_reviews ?? true,
              email_payout_updates: preferences?.email_payout_updates ?? true,
              email_event_reminders: preferences?.email_event_reminders ?? true,
              email_marketing: preferences?.email_marketing ?? false,
              sms_ticket_sales: preferences?.sms_ticket_sales ?? false,
              sms_event_reminders: preferences?.sms_event_reminders ?? false,
              push_ticket_sales: preferences?.push_ticket_sales ?? true,
              push_new_reviews: preferences?.push_new_reviews ?? true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
