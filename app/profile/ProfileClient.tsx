'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { type UserProfile } from '@/lib/firestore/user-profile'
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard'
import { SocialLinksCard } from '@/components/profile/SocialLinksCard'
import { PrivacyCard } from '@/components/profile/PrivacyCard'
import { PreferencesCard } from '@/components/profile/PreferencesCard'
import { NotificationsCard } from '@/components/profile/NotificationsCard'
import { AccountCard } from '@/components/profile/AccountCard'

interface ProfileClientProps {
  initialProfile: UserProfile
  userId: string
  isVerifiedOrganizer: boolean
}

export default function ProfileClient({ initialProfile, userId, isVerifiedOrganizer }: ProfileClientProps) {
  const router = useRouter()
  const { t } = useTranslation('profile')
  const [profile, setProfile] = useState<UserProfile>(initialProfile)

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      // Optimistic update
      const previousProfile = profile
      setProfile(prev => ({ ...prev, ...updates }))

      // Update via API route (uses admin SDK)
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      // Refresh the page to update navbar
      router.refresh()

      console.log('Profile updated successfully')
    } catch (error) {
      console.error('Failed to update profile:', error)
      // Revert optimistic update on error
      router.refresh()
      throw error
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{t('title')}</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">{t('subtitle')}</p>
          </div>
          {/* Organizer Settings Button - Only show for verified organizers */}
          {isVerifiedOrganizer && (
            <a
              href="/organizer/settings"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">{t('organizer_settings')}</span>
              <span className="sm:hidden">{t('common:nav.settings')}</span>
            </a>
          )}
        </div>
      </div>

      {/* Profile Cards */}
      <div className="space-y-3 sm:space-y-6">
        {/* Profile Header */}
        <ProfileHeaderCard profile={profile} onUpdate={handleUpdateProfile} />

        {/* Social & Bio */}
        <SocialLinksCard profile={profile} onUpdate={handleUpdateProfile} />

        {/* Privacy */}
        <PrivacyCard profile={profile} onUpdate={handleUpdateProfile} />

        {/* Preferences */}
        <PreferencesCard profile={profile} onUpdate={handleUpdateProfile} />

        {/* Notifications */}
        <NotificationsCard profile={profile} onUpdate={handleUpdateProfile} />

        {/* Account */}
        <AccountCard />
      </div>
    </>
  )
}
