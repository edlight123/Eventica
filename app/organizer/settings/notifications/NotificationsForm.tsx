'use client';

import { useState } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface NotificationsFormProps {
  userId: string;
  initialData: {
    email_ticket_sales: boolean;
    email_new_reviews: boolean;
    email_payout_updates: boolean;
    email_event_reminders: boolean;
    email_marketing: boolean;
    sms_ticket_sales: boolean;
    sms_event_reminders: boolean;
    push_ticket_sales: boolean;
    push_new_reviews: boolean;
  };
}

export default function NotificationsForm({ userId, initialData }: NotificationsFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleToggle = (key: keyof typeof formData) => {
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organizer/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update notifications');
      }

      showToast({
        title: 'Preferences saved',
        message: 'Your notification preferences have been updated.',
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating notifications:', error);
      showToast({
        title: 'Error',
        message: 'Failed to update preferences. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      {/* Email Notifications */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
        </div>
        <div className="space-y-4">
          <ToggleItem
            label="Ticket Sales"
            message="Get notified when someone purchases a ticket"
            checked={formData.email_ticket_sales}
            onChange={() => handleToggle('email_ticket_sales')}
          />
          <ToggleItem
            label="New Reviews"
            message="Get notified when your event receives a review"
            checked={formData.email_new_reviews}
            onChange={() => handleToggle('email_new_reviews')}
          />
          <ToggleItem
            label="Payout Updates"
            message="Get notified about payout status changes"
            checked={formData.email_payout_updates}
            onChange={() => handleToggle('email_payout_updates')}
          />
          <ToggleItem
            label="Event Reminders"
            message="Get reminders before your events start"
            checked={formData.email_event_reminders}
            onChange={() => handleToggle('email_event_reminders')}
          />
          <ToggleItem
            label="Marketing & Updates"
            message="Receive tips, feature updates, and promotional content"
            checked={formData.email_marketing}
            onChange={() => handleToggle('email_marketing')}
          />
        </div>
      </div>

      {/* SMS Notifications */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">SMS Notifications</h3>
        </div>
        <div className="space-y-4">
          <ToggleItem
            label="Ticket Sales"
            message="Receive SMS when someone purchases a ticket"
            checked={formData.sms_ticket_sales}
            onChange={() => handleToggle('sms_ticket_sales')}
          />
          <ToggleItem
            label="Event Reminders"
            message="Receive SMS reminders before your events"
            checked={formData.sms_event_reminders}
            onChange={() => handleToggle('sms_event_reminders')}
          />
        </div>
        <p className="text-xs text-gray-500 mt-3">
          SMS notifications require a verified phone number. Standard rates may apply.
        </p>
      </div>

      {/* Push Notifications */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
        </div>
        <div className="space-y-4">
          <ToggleItem
            label="Ticket Sales"
            message="Get instant push notifications for ticket sales"
            checked={formData.push_ticket_sales}
            onChange={() => handleToggle('push_ticket_sales')}
          />
          <ToggleItem
            label="New Reviews"
            message="Get instant push notifications for new reviews"
            checked={formData.push_new_reviews}
            onChange={() => handleToggle('push_new_reviews')}
          />
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Push notifications require the Eventica mobile app.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
}

function ToggleItem({
  label,
  message,
  checked,
  onChange,
}: {
  label: string;
  message: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-orange-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
