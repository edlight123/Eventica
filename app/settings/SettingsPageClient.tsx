'use client'

import { useTranslation } from 'react-i18next'
import { User, Shield, Bell, Lock, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'

interface SettingsPageClientProps {
  user: {
    id: string
    full_name: string
    email: string
    phone_number?: string
    is_verified: boolean
    role: string
  }
}

export default function SettingsPageClient({ user }: SettingsPageClientProps) {
  const { t } = useTranslation('settings')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Back Button */}
      <Link 
        href="/profile"
        className="inline-flex items-center gap-2 text-white/65 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">{t('back_to_profile')}</span>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
        <p className="text-white/65 mt-2">{t('subtitle')}</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        
        {/* Personal Information */}
        <div className="bg-[#0a0a0a] rounded-2xl shadow-soft border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <User className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('personal_info.title')}</h2>
              <p className="text-sm text-white/65">{t('personal_info.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">{t('personal_info.full_name')}</label>
                <div className="px-4 py-3 bg-[#0a0a0a] rounded-xl border border-white/10">
                  <p className="text-white font-medium">{user.full_name}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">{t('personal_info.email')}</label>
                <div className="px-4 py-3 bg-[#0a0a0a] rounded-xl border border-white/10">
                  <p className="text-white font-medium">{user.email}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">{t('personal_info.phone')}</label>
              <div className="px-4 py-3 bg-[#0a0a0a] rounded-xl border border-white/10">
                <p className="text-white font-medium">{user.phone_number || t('personal_info.not_provided')}</p>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm text-white/65 bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                <strong className="text-white">{t('personal_info.note')}:</strong> {t('personal_info.note_text')}
              </p>
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-[#0a0a0a] rounded-2xl shadow-soft border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('security.title')}</h2>
              <p className="text-sm text-white/65">{t('security.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">{t('security.verification_status')}</label>
              <div className="flex items-center gap-3">
                {user.is_verified ? (
                  <Badge variant="success" size="lg" icon={<Shield className="w-5 h-5" />}>
                    {t('security.verified')}
                  </Badge>
                ) : (
                  <div className="flex items-center gap-3">
                    <Badge variant="warning" size="lg">
                      {t('security.not_verified')}
                    </Badge>
                    {user.role === 'organizer' && (
                      <Link
                        href="/organizer/verify"
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors text-sm"
                      >
                        {t('security.get_verified')}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">{t('security.role')}</label>
              <Badge variant={user.role === 'organizer' ? 'vip' : 'primary'} size="lg">
                {user.role === 'organizer' ? t('security.event_organizer') : t('security.event_attendee')}
              </Badge>
            </div>

            <div className="pt-4 border-t border-white/10">
              <Link
                href="/api/auth/logout"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-100 text-red-600 font-medium transition-colors"
              >
                <Lock className="w-4 h-4" />
                {t('security.change_password')}
              </Link>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-[#0a0a0a] rounded-2xl shadow-soft border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('notifications.title')}</h2>
              <p className="text-sm text-white/65">{t('notifications.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Link 
              href="/settings/notifications"
              className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              <div>
                <p className="font-semibold text-white">{t('notifications.preferences')}</p>
                <p className="text-sm text-white/65">{t('notifications.preferences_desc')}</p>
              </div>
              <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-[#0a0a0a] rounded-2xl shadow-soft border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t('danger.title')}</h2>
              <p className="text-sm text-white/65">{t('danger.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 border border-red-200 rounded-xl">
              <p className="font-semibold text-red-300 mb-2">{t('danger.delete_account')}</p>
              <p className="text-sm text-red-300 mb-4">
                {t('danger.delete_warning')}
              </p>
              <button
                disabled
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('danger.delete_button')}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
