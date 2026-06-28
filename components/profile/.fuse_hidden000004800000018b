'use client'

import { useState } from 'react'
import { Instagram, Music2, Twitter, Facebook, Edit2, Check, X, AtSign } from 'lucide-react'
import type { UserProfile } from '@/lib/firestore/user-profile'
import type { SocialLinks } from '@/types/social'

interface SocialLinksCardProps {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
}

const PLATFORMS: Array<{
  key: keyof SocialLinks
  label: string
  placeholder: string
  Icon: typeof Instagram
  color: string
}> = [
  { key: 'instagram', label: 'Instagram', placeholder: 'yourhandle', Icon: Instagram, color: 'text-pink-600' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'yourhandle', Icon: Music2, color: 'text-white' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: 'yourhandle', Icon: Twitter, color: 'text-sky-500' },
  { key: 'facebook', label: 'Facebook', placeholder: 'your.profile', Icon: Facebook, color: 'text-blue-600' },
]

export function SocialLinksCard({ profile, onUpdate }: SocialLinksCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [bio, setBio] = useState(profile.bio || '')
  const [links, setLinks] = useState<SocialLinks>({
    instagram: profile.socialLinks?.instagram || '',
    tiktok: profile.socialLinks?.tiktok || '',
    twitter: profile.socialLinks?.twitter || '',
    facebook: profile.socialLinks?.facebook || '',
  })

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onUpdate({ bio, socialLinks: links })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update social links:', error)
      alert('Could not save. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setBio(profile.bio || '')
    setLinks({
      instagram: profile.socialLinks?.instagram || '',
      tiktok: profile.socialLinks?.tiktok || '',
      twitter: profile.socialLinks?.twitter || '',
      facebook: profile.socialLinks?.facebook || '',
    })
    setIsEditing(false)
  }

  const hasAnyLink = PLATFORMS.some((p) => (profile.socialLinks?.[p.key] || '').trim())

  return (
    <div className="bg-[#0a0a0a] rounded-2xl shadow-sm border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <AtSign className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Social & Bio</h2>
            <p className="text-sm text-white/65">Let people connect with you off Tikèm</p>
          </div>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white/65 hover:bg-white/[0.04] rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Bio */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Bio</label>
        {isEditing ? (
          <div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              rows={3}
              placeholder="Tell people a little about yourself"
              className="w-full px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-white/40 mt-1 text-right">{bio.length}/280</p>
          </div>
        ) : (
          <p className="text-sm text-white/70 whitespace-pre-line">
            {profile.bio?.trim() ? profile.bio : <span className="text-white/40">No bio yet</span>}
          </p>
        )}
      </div>

      {/* Social handles */}
      <div className="space-y-3">
        {PLATFORMS.map(({ key, label, placeholder, Icon, color }) => {
          const value = isEditing ? links[key] || '' : profile.socialLinks?.[key] || ''
          if (!isEditing && !value) return null
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              {isEditing ? (
                <div className="flex-1 flex items-center rounded-lg border border-white/10 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent overflow-hidden">
                  <span className="pl-3 pr-1 text-white/40 select-none">@</span>
                  <input
                    type="text"
                    value={links[key] || ''}
                    onChange={(e) => setLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 py-2 pr-3 outline-none"
                    aria-label={label}
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <p className="text-xs text-white/50">{label}</p>
                  <p className="text-sm font-medium text-white">@{value}</p>
                </div>
              )}
            </div>
          )
        })}

        {!isEditing && !hasAnyLink && (
          <p className="text-sm text-white/40">No social accounts added yet.</p>
        )}
      </div>

      {isEditing && (
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-300">
            These links are shown on your public profile exactly as you enter them. We don&apos;t verify
            account ownership.
          </p>
        </div>
      )}
    </div>
  )
}
