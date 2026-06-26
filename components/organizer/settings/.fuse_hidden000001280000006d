'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  User,
  Building2,
  Settings as SettingsIcon,
  CreditCard,
  ShieldCheck,
  Users,
  Bell,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  HelpCircle,
  ChevronRight
} from 'lucide-react'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

interface SettingsContentProps {
  isVerified: boolean
  isPending: boolean
  hasPayoutSetup: boolean
  defaultLocation: string
  payoutStatusText: string
}

export default function SettingsContent({
  isVerified,
  isPending,
  hasPayoutSetup,
  defaultLocation,
  payoutStatusText
}: SettingsContentProps) {
  const { t } = useTranslation('organizer')

  return (
    <>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <Link
          href="/organizer/events"
          className="text-brand-700 hover:text-brand-800 text-sm font-medium mb-3 inline-block"
        >
          {t('settings.back_to_events')}
        </Link>
        <EditorialHeader eyebrow={t('settings.eyebrow', 'Organizer')} title={t('settings.title')} subtitle={t('settings.subtitle')} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Verification Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isVerified ? 'bg-green-100' : isPending ? 'bg-amber-100' : 'bg-gray-100'
            }`}>
              {isVerified ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : isPending ? (
                <Clock className="w-5 h-5 text-amber-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('settings.verification')}</p>
          <p className={`text-sm font-semibold mt-1 ${
            isVerified ? 'text-green-600' : isPending ? 'text-amber-600' : 'text-gray-600'
          }`}>
            {isVerified ? t('settings.verified') : isPending ? t('settings.pending') : t('settings.not_verified')}
          </p>
        </div>

        {/* Payout Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              hasPayoutSetup ? 'bg-brand-50' : 'bg-gray-100'
            }`}>
              <CreditCard className={`w-5 h-5 ${hasPayoutSetup ? 'text-brand-700' : 'text-gray-400'}`} />
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('settings.payouts')}</p>
          <p className={`text-sm font-semibold mt-1 ${hasPayoutSetup ? 'text-brand-700' : 'text-gray-600'}`}>
            {hasPayoutSetup ? t('settings.configured') : t('settings.not_setup')}
          </p>
        </div>

        {/* Default Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-brand-700" />
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('settings.location')}</p>
          <p className="text-sm font-semibold mt-1 text-gray-900 truncate">
            {defaultLocation === 'Not set' ? t('settings.not_set') : defaultLocation}
          </p>
        </div>

        {/* Support */}
        <Link
          href="/support"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-brand-700" />
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('settings.need_help')}</p>
          <p className="text-sm font-semibold mt-1 text-brand-700">{t('settings.contact_support')}</p>
        </Link>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.account_settings')}</h2>

        {/* Profile */}
        <Link
          href="/organizer/settings/profile"
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{t('settings.profile')}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.profile_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Organization/Brand */}
        <Link
          href="/organizer/settings/organization"
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{t('settings.organization_brand')}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.organization_brand_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Event Defaults */}
        <Link
          href="/organizer/settings/defaults"
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <SettingsIcon className="w-6 h-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{t('settings.event_defaults')}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.event_defaults_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Payments & Payouts */}
        <Link
          href="/organizer/settings/payouts"
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{t('settings.payments_payouts')}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.payments_payouts_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Verification */}
        <Link
          href="/organizer/verify"
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {t('settings.verification_title')}
                {!isVerified && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {t('settings.action_needed')}
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.verification_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Team & Permissions */}
        <Link
          href="/organizer/settings/team"
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{t('settings.team_permissions')}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.team_permissions_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Notifications */}
        <Link
          href="/organizer/settings/notifications"
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bell className="w-6 h-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{t('settings.notifications')}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.notifications_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Security */}
        <Link
          href="/organizer/settings/security"
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-brand-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{t('settings.security')}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.security_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>

        {/* Danger Zone */}
        <Link
          href="/organizer/settings/danger-zone"
          className="block bg-white rounded-xl border border-red-200 p-4 hover:border-red-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-900">{t('settings.danger_zone')}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{t('settings.danger_zone_desc')}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>
      </div>
    </>
  )
}
