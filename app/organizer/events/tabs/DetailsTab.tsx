'use client'

import { EventFormData, TabValidation } from '@/lib/event-validation'
import { AlertCircle, CheckCircle, Tag, X } from 'lucide-react'
import { useState } from 'react'

const POPULAR_TAGS = ['music', 'food', 'outdoor', 'indoor', 'family-friendly', 'nightlife', 'cultural', 'educational', 'networking', 'charity', 'vip', 'free-drinks', 'live-band', 'dj', 'art', 'dance']

interface DetailsTabProps {
  formData: EventFormData
  onChange: (field: keyof EventFormData, value: any) => void
  validation: TabValidation
}

export function DetailsTab({ formData, onChange, validation }: DetailsTabProps) {
  const [tagInput, setTagInput] = useState('')

  const descriptionError = validation.missingFields.find(f => f.toLowerCase().includes('description'))
  const minDescLength = 80

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !formData.tags?.includes(trimmed)) {
      onChange('tags', [...(formData.tags || []), trimmed])
    }
  }

  const removeTag = (tag: string) => {
    onChange('tags', formData.tags?.filter(t => t !== tag) || [])
  }

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (tagInput.trim()) {
        addTag(tagInput)
        setTagInput('')
      }
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Section Header */}
      <div>
        <h2 className="font-display text-lg text-white mb-2">Event Details</h2>
        <p className="text-white/60">Help attendees understand what to expect</p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-white/70 mb-2">
          Event Description <span className="text-red-300">*</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={8}
          placeholder="Describe your event in detail... What makes it special? What should attendees expect? Include schedule, activities, amenities, and any other important information."
          className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 transition-all resize-none ${
            descriptionError
              ? 'border-red-300 focus:border-red-500'
              : formData.description.length >= minDescLength
              ? 'border-emerald-500/40 focus:border-emerald-500'
              : 'border-white/10 focus:border-brand-500'
          }`}
        />
        
        <div className="flex items-center justify-between mt-2">
          <div>
            {descriptionError ? (
              <p className="flex items-center gap-1 text-sm text-red-300 font-medium">
                <AlertCircle className="w-4 h-4" />
                {descriptionError}
              </p>
            ) : formData.description.length >= minDescLength ? (
              <p className="flex items-center gap-1 text-sm text-emerald-300 font-medium">
                <CheckCircle className="w-4 h-4" />
                Great description!
              </p>
            ) : formData.description.length > 0 ? (
              <p className="text-sm text-amber-300 font-medium">
                {minDescLength - formData.description.length} more characters needed
              </p>
            ) : null}
          </div>
          <span className={`text-sm ${
            formData.description.length > 5000
              ? 'text-red-300 font-semibold'
              : formData.description.length >= minDescLength
              ? 'text-emerald-300 font-medium'
              : 'text-white/50'
          }`}>
            {formData.description.length} / {minDescLength} min
          </span>
        </div>

        <p className="text-xs text-white/50 mt-2">
          Tip: Include what makes your event unique, what&apos;s included, and what attendees should bring
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-white/70 mb-3">
          Event Tags <span className="text-white/50 text-xs">(Optional)</span>
        </label>
        <p className="text-sm text-white/60 mb-4">
          Help people discover your event through search and filters
        </p>

        {/* Popular Tags */}
        <div className="mb-4">
          <p className="text-xs font-bold text-white/70 mb-3 uppercase tracking-wide">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                disabled={formData.tags?.includes(tag)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                  formData.tags?.includes(tag)
                    ? 'text-brand-300 border-brand-300 cursor-not-allowed'
                    : 'bg-[#0a0a0a] text-white/70 border-white/10 hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Tag Input */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleTagInputKeyPress}
            placeholder="Add custom tag (press Enter)"
            className="flex-1 px-3 py-2.5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
          />
          <button
            type="button"
            onClick={() => {
              if (tagInput.trim()) {
                addTag(tagInput)
                setTagInput('')
              }
            }}
            className="px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold transition-all"
          >
            Add
          </button>
        </div>

        {/* Selected Tags */}
        {formData.tags && formData.tags.length > 0 && (
          <div className="border border-brand-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-brand-300 uppercase tracking-wide">
                Selected tags ({formData.tags.length})
              </p>
              {formData.tags.length > 10 && (
                <p className="text-xs text-amber-300 font-medium">
                  Consider using fewer tags for better targeting
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <div
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-700 text-white font-medium rounded-lg shadow-sm group hover:bg-brand-800 transition-colors"
                >
                  <span className="text-sm">{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:bg-brand-900 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <div className="border border-amber-500/30 rounded-lg p-4">
          <p className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Suggestions
          </p>
          <ul className="list-disc list-inside space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-amber-300">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Writing Tips */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-brand-300 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <p className="font-semibold text-white mb-1">Writing a Great Description</p>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Start with an exciting hook that grabs attention</li>
              <li>• Describe the experience, not just the facts</li>
              <li>• Include lineup, schedule, food/drinks, parking info</li>
              <li>• Mention what&apos;s provided vs. what to bring</li>
              <li>• End with a call-to-action (&quot;Get your tickets now!&quot;)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
