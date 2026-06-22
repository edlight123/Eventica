'use client'

import { useTranslation } from 'react-i18next'

export function AdminAccessDenied({ userEmail }: { userEmail?: string | null }) {
  const { t } = useTranslation('admin')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('dashboard.access_denied')}
        </h1>
        <p className="text-gray-600 mb-4">
          {t('dashboard.no_admin_privileges')}
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            <strong>{t('dashboard.your_email')}</strong> {userEmail}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {t('dashboard.contact_admin')}
          </p>
        </div>
        <a
          href="/"
          className="inline-block bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors"
        >
          {t('dashboard.return_home')}
        </a>
      </div>
    </div>
  )
}
