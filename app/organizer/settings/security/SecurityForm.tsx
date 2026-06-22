'use client';

import { useState } from 'react';
import { Lock, Key, Monitor, MapPin, Clock, Loader2, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface LoginRecord {
  id: string;
  timestamp: string;
  ip_address?: string;
  device?: string;
  location?: string;
  status: string;
}

interface SecurityFormProps {
  userId: string;
  loginHistory: any[];
}

export default function SecurityForm({ userId, loginHistory }: SecurityFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { showToast } = useToast();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast({
        title: 'Passwords do not match',
        message: 'Please make sure your new passwords match.',
        type: 'error',
      });
      return;
    }

    if (newPassword.length < 8) {
      showToast({
        title: 'Password too short',
        message: 'Password must be at least 8 characters long.',
        type: 'error',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/organizer/settings/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      showToast({
        title: 'Password changed',
        message: 'Your password has been successfully updated.',
        type: 'success',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      showToast({
        title: 'Error',
        message: error.message || 'Failed to change password',
        type: 'error',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Key className="w-5 h-5 text-brand-700" />
          <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                id="current_password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Enter current password"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                id="new_password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Enter new password"
                required
                minLength={8}
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                id="confirm_password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
            {isChangingPassword ? 'Updating...' : 'Update Password'}
          </button>
          <p className="text-xs text-gray-500">
            Password must be at least 8 characters long
          </p>
        </form>
      </div>

      {/* Two-Factor Authentication (Future) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-700" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600 mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Login History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-brand-700" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Login Activity</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Monitor recent logins to your account
          </p>
        </div>
        {loginHistory.length === 0 ? (
          <div className="p-12 text-center">
            <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No recent activity to display</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {loginHistory.map((record: LoginRecord) => (
              <div key={record.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {record.device || 'Unknown Device'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {record.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{record.location}</span>
                        </div>
                      )}
                      {record.ip_address && (
                        <span className="font-mono text-xs">{record.ip_address}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(record.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
