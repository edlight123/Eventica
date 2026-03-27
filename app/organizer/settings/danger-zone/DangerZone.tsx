'use client';

import { useState } from 'react';
import { Download, XCircle, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

interface DangerZoneProps {
  userId: string;
}

export default function DangerZone({ userId }: DangerZoneProps) {
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { showToast } = useToast();
  const router = useRouter();

  const handleExportData = async () => {
    setIsExporting(true);

    try {
      const response = await fetch('/api/organizer/settings/danger-zone/export-data', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventica-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast({
        title: 'Data exported',
        message: 'Your data has been downloaded successfully.',
        type: 'success',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast({
        title: 'Error',
        message: 'Failed to export data. Please try again.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);

    try {
      const response = await fetch('/api/organizer/settings/danger-zone/deactivate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate account');
      }

      showToast({
        title: 'Account deactivated',
        message: 'Your account has been deactivated. You can reactivate within 30 days.',
        type: 'success',
      });

      // Sign out and redirect
      setTimeout(() => {
        router.push('/api/auth/signout');
      }, 2000);
    } catch (error) {
      console.error('Error deactivating account:', error);
      showToast({
        title: 'Error',
        message: 'Failed to deactivate account. Please try again.',
        type: 'error',
      });
    } finally {
      setIsDeactivating(false);
      setShowDeactivateModal(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      showToast({
        title: 'Confirmation required',
        message: 'Please type "DELETE MY ACCOUNT" exactly to confirm.',
        type: 'error',
      });
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/organizer/settings/danger-zone/delete', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      showToast({
        title: 'Account deleted',
        message: 'Your account and all data have been permanently deleted.',
        type: 'success',
      });

      setTimeout(() => {
        router.push('/api/auth/signout');
      }, 2000);
    } catch (error) {
      console.error('Error deleting account:', error);
      showToast({
        title: 'Error',
        message: 'Failed to delete account. Please try again.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Data */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Export Your Data</h3>
            </div>
            <p className="text-sm text-gray-600">
              Download a copy of all your data including events, tickets, and payouts in JSON format.
            </p>
          </div>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>

      {/* Deactivate Account */}
      <div className="bg-white rounded-xl border-2 border-yellow-300 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">Deactivate Account</h3>
            </div>
            <p className="text-sm text-gray-600">
              Temporarily disable your account. You can reactivate within 30 days. Your events will be hidden.
            </p>
          </div>
          <button
            onClick={() => setShowDeactivateModal(true)}
            className="px-4 py-2 border-2 border-yellow-400 hover:border-yellow-500 text-yellow-700 font-medium rounded-lg transition-colors"
          >
            Deactivate
          </button>
        </div>
      </div>

      {/* Delete Account */}
      <div className="bg-white rounded-xl border-2 border-red-300 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-gray-900">Delete Account Permanently</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              <li>All events, tickets, and attendee data will be deleted</li>
              <li>Pending payouts will be forfeited</li>
              <li>Your organizer profile will be removed</li>
              <li>This action is immediate and irreversible</li>
            </ul>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <h3 className="text-xl font-bold text-gray-900">Deactivate Account?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Your account will be deactivated and your events will be hidden. You can reactivate within 30 days by logging in again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="flex-1 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeactivating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-bold text-gray-900">Delete Account Forever?</h3>
            </div>
            <p className="text-gray-600 mb-4">
              This action is <strong>permanent and irreversible</strong>. All your data will be permanently deleted.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono text-red-600">DELETE MY ACCOUNT</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || confirmText !== 'DELETE MY ACCOUNT'}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
