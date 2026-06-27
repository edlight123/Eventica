'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import { User, Mail, Phone, Calendar, Edit2, Check, X } from 'lucide-react'
import type { UserProfile } from '@/lib/firestore/user-profile'

interface ProfileHeaderCardProps {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
}

export function ProfileHeaderCard({ profile, onUpdate }: ProfileHeaderCardProps) {
  const { t } = useTranslation('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [phone, setPhone] = useState(profile.phone || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert(t('header.full_name_required'))
      return
    }

    setIsLoading(true)
    try {
      await onUpdate({ displayName, phone })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert(t('header.save_error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setDisplayName(profile.displayName)
    setPhone(profile.phone || '')
    setIsEditing(false)
  }

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('header.title')}</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            {t('header.edit_profile')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {t('header.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isLoading ? t('header.saving') : t('header.save')}
            </button>
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
            {profile.photoURL ? (
              <Image
                src={profile.photoURL}
                alt={profile.displayName}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-gray-400" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {t('header.full_name')}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder={t('header.full_name_placeholder')}
              />
            ) : (
              <p className="text-lg font-bold text-gray-900">{profile.displayName || t('header.phone_not_set')}</p>
            )}
          </div>

          {/* Member Since */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{t('header.member_since')} {memberSince}</span>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {t('header.email')}
            </label>
            <div className="flex items-center gap-2 text-gray-900">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{profile.email}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{t('header.email_readonly')}</span>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {t('header.phone')}
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder={t('header.phone_placeholder')}
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-900">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{profile.phone || t('header.phone_not_set')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
