'use client'

import { useState } from 'react'

interface VirtualEventSettings {
  isVirtual: boolean
  isHybrid: boolean
  streamingUrl: string
  meetingLink: string
  platform: string
  accessInstructions: string
}

interface VirtualEventConfigProps {
  eventId: string
  initialSettings?: Partial<VirtualEventSettings>
  onSave?: () => void
}

export default function VirtualEventConfig({
  eventId,
  initialSettings = {},
  onSave,
}: VirtualEventConfigProps) {
  const [settings, setSettings] = useState<VirtualEventSettings>({
    isVirtual: initialSettings.isVirtual || false,
    isHybrid: initialSettings.isHybrid || false,
    streamingUrl: initialSettings.streamingUrl || '',
    meetingLink: initialSettings.meetingLink || '',
    platform: initialSettings.platform || '',
    accessInstructions: initialSettings.accessInstructions || '',
  })

  const [saving, setSaving] = useState(false)

  const handleEventTypeChange = (type: 'physical' | 'virtual' | 'hybrid') => {
    setSettings({
      ...settings,
      isVirtual: type === 'virtual',
      isHybrid: type === 'hybrid',
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch('/api/virtual-events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ...settings,
        }),
      })

      if (response.ok) {
        alert('Virtual event settings saved successfully')
        onSave?.()
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const currentType = settings.isVirtual
    ? 'virtual'
    : settings.isHybrid
    ? 'hybrid'
    : 'physical'

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Event Format
        </h3>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-[#0a0a0a]">
            <input
              type="radio"
              checked={currentType === 'physical'}
              onChange={() => handleEventTypeChange('physical')}
              className="text-brand-600 focus:ring-brand-500"
            />
            <div>
              <div className="font-medium text-white">In-Person Only</div>
              <div className="text-sm text-white/50">
                Traditional physical event at a venue
              </div>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-[#0a0a0a]">
            <input
              type="radio"
              checked={currentType === 'virtual'}
              onChange={() => handleEventTypeChange('virtual')}
              className="text-brand-600 focus:ring-brand-500"
            />
            <div>
              <div className="font-medium text-white">Virtual Only</div>
              <div className="text-sm text-white/50">
                Online event accessible from anywhere
              </div>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-[#0a0a0a]">
            <input
              type="radio"
              checked={currentType === 'hybrid'}
              onChange={() => handleEventTypeChange('hybrid')}
              className="text-brand-600 focus:ring-brand-500"
            />
            <div>
              <div className="font-medium text-white">Hybrid</div>
              <div className="text-sm text-white/50">
                Both in-person and virtual attendance options
              </div>
            </div>
          </label>
        </div>
      </div>

      {(settings.isVirtual || settings.isHybrid) && (
        <>
          <div className="pt-6 border-t space-y-4">
            <h4 className="font-medium text-white">Virtual Event Details</h4>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                Platform
              </label>
              <select
                value={settings.platform}
                onChange={(e) => setSettings({ ...settings, platform: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 rounded-md focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Select platform</option>
                <option value="zoom">Zoom</option>
                <option value="google-meet">Google Meet</option>
                <option value="microsoft-teams">Microsoft Teams</option>
                <option value="youtube">YouTube Live</option>
                <option value="facebook">Facebook Live</option>
                <option value="twitch">Twitch</option>
                <option value="custom">Custom Platform</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                Streaming URL
              </label>
              <input
                type="url"
                value={settings.streamingUrl}
                onChange={(e) => setSettings({ ...settings, streamingUrl: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 rounded-md focus:ring-brand-500 focus:border-brand-500"
                placeholder="https://example.com/stream"
              />
              <p className="text-xs text-white/50 mt-1">
                Public streaming URL (e.g., YouTube, Facebook Live)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                Meeting Link
              </label>
              <input
                type="url"
                value={settings.meetingLink}
                onChange={(e) => setSettings({ ...settings, meetingLink: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 rounded-md focus:ring-brand-500 focus:border-brand-500"
                placeholder="https://zoom.us/j/123456789"
              />
              <p className="text-xs text-white/50 mt-1">
                Private meeting link (only visible to ticket holders)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">
                Access Instructions
              </label>
              <textarea
                rows={4}
                value={settings.accessInstructions}
                onChange={(e) => setSettings({ ...settings, accessInstructions: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 rounded-md focus:ring-brand-500 focus:border-brand-500"
                placeholder="Provide instructions for accessing the virtual event...&#10;&#10;Examples:&#10;- Password or meeting ID&#10;- Required software or apps&#10;- How to join&#10;- Technical requirements"
              />
            </div>
          </div>

          <div className="border border-brand-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-brand-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-brand-300">
                <p className="font-medium mb-1">Virtual Event Tips</p>
                <ul className="list-disc list-inside space-y-1 text-brand-300">
                  <li>Test your streaming setup before the event</li>
                  <li>Provide meeting links only to ticket holders</li>
                  <li>Include timezone information in event details</li>
                  <li>Consider recording for on-demand viewing</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="pt-6 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Virtual Event Settings'}
        </button>
      </div>
    </div>
  )
}
