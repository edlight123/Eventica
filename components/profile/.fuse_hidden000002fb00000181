'use client'

import { useState } from 'react'
import { Shield, Lock, Users, Globe, Phone } from 'lucide-react'
import type { UserProfile } from '@/lib/firestore/user-profile'
import { DEFAULT_PRIVACY, type AttendanceVisibility, type ProfileVisibility } from '@/types/social'

interface PrivacyCardProps {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
}

const ATTENDANCE_OPTIONS: Array<{
  value: AttendanceVisibility
  label: string
  description: string
  Icon: typeof Lock
}> = [
  {
    value: 'nobody',
    label: 'Private',
    description: 'No one can see the events you\'re attending',
    Icon: Lock,
  },
  {
    value: 'friends',
    label: 'Friends only',
    description: 'Only your friends can see you\'re going',
    Icon: Users,
  },
  {
    value: 'everyone',
    label: 'Everyone',
    description: 'Show me in the public "Who\'s going" list',
    Icon: Globe,
  },
]

export function PrivacyCard({ profile, onUpdate }: PrivacyCardProps) {
  const initial = { ...DEFAULT_PRIVACY, ...(profile.privacy || {}) }
  const [privacy, setPrivacy] = useState(initial)
  const [isUpdating, setIsUpdating] = useState(false)

  const persist = async (next: typeof privacy) => {
    const previous = privacy
    setPrivacy(next)
    setIsUpdating(true)
    try {
      await onUpdate({ privacy: next })
    } catch (error) {
      console.error('Failed to update privacy:', error)
      setPrivacy(previous)
    } finally {
      setIsUpdating(false)
    }
  }

  const setAttendance = (value: AttendanceVisibility) => persist({ ...privacy, attendance_visibility: value })
  const setProfileVisibility = (value: ProfileVisibility) => persist({ ...privacy, profile_visibility: value })
  const toggleDiscoverable = () => persist({ ...privacy, discoverable_by_phone: !privacy.discoverable_by_phone })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Privacy</h2>
          <p className="text-sm text-gray-600">You control who sees your activity. Everything is private by default.</p>
        </div>
      </div>

      {/* Attendance visibility */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">Who can see events I&apos;m going to</h3>
        <p className="text-sm text-gray-600 mb-3">This controls the &quot;Who&apos;s going&quot; section on events.</p>
        <div className="space-y-2">
          {ATTENDANCE_OPTIONS.map(({ value, label, description, Icon }) => {
            const active = privacy.attendance_visibility === value
            return (
              <button
                key={value}
                onClick={() => setAttendance(value)}
                disabled={isUpdating}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors disabled:opacity-60 ${
                  active
                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
                <span
                  className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    active ? 'border-teal-600 bg-teal-600' : 'border-gray-300'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Profile visibility */}
      <div className="flex items-start justify-between py-3 border-t border-gray-100">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-gray-900 mb-1">Public profile</h3>
          <p className="text-sm text-gray-600">
            Let anyone view your profile, bio, and social links. When off, only friends can see them.
          </p>
        </div>
        <button
          onClick={() => setProfileVisibility(privacy.profile_visibility === 'public' ? 'private' : 'public')}
          disabled={isUpdating}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
            privacy.profile_visibility === 'public' ? 'bg-teal-600' : 'bg-gray-200'
          }`}
          aria-pressed={privacy.profile_visibility === 'public'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              privacy.profile_visibility === 'public' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Phone discovery */}
      <div className="flex items-start justify-between py-3 border-t border-gray-100">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Find me by phone number</h3>
          </div>
          <p className="text-sm text-gray-600">
            Let people who already have your number find you when they sync contacts. Your number is never shown.
          </p>
        </div>
        <button
          onClick={toggleDiscoverable}
          disabled={isUpdating}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
            privacy.discoverable_by_phone ? 'bg-teal-600' : 'bg-gray-200'
          }`}
          aria-pressed={privacy.discoverable_by_phone}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              privacy.discoverable_by_phone ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
