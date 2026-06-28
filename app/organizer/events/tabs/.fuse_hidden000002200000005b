'use client'

import { EventFormData, TabValidation } from '@/lib/event-validation'
import ImageUpload from '@/components/ImageUpload'
import { AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react'

const CATEGORIES = ['Concert', 'Party', 'Conference', 'Festival', 'Workshop', 'Sports', 'Theater', 'Other']

interface BasicInfoTabProps {
  formData: EventFormData
  onChange: (field: keyof EventFormData, value: any) => void
  validation: TabValidation
}

export function BasicInfoTab({ formData, onChange, validation }: BasicInfoTabProps) {
  const titleError = validation.missingFields.find(f => f.toLowerCase().includes('title'))
  const categoryError = validation.missingFields.find(f => f.toLowerCase().includes('category'))
  const imageError = validation.missingFields.find(f => f.toLowerCase().includes('image'))

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Section Header */}
      <div>
        <h2 className="font-display text-lg text-white mb-2">Basic Information</h2>
        <p className="text-white/60">Tell attendees what your event is about</p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-white/70 mb-2">
          Event Title <span className="text-red-300">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="e.g., Summer Music Festival 2025"
          className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 transition-all text-lg ${
            titleError
              ? 'border-red-300 focus:border-red-500'
              : formData.title.length >= 5
              ? 'border-emerald-500/40 focus:border-emerald-500'
              : 'border-white/10 focus:border-brand-500'
          }`}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {titleError ? (
              <span className="flex items-center gap-1 text-sm text-red-300 font-medium">
                <AlertCircle className="w-4 h-4" />
                {titleError}
              </span>
            ) : formData.title.length >= 5 ? (
              <span className="flex items-center gap-1 text-sm text-emerald-300 font-medium">
                <CheckCircle className="w-4 h-4" />
                Looks good
              </span>
            ) : null}
          </div>
          <span className={`text-sm ${formData.title.length > 100 ? 'text-amber-300 font-semibold' : 'text-white/50'}`}>
            {formData.title.length}/100
          </span>
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-semibold text-white/70 mb-2">
          Category <span className="text-red-300">*</span>
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => onChange('category', e.target.value)}
          className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 transition-all text-base ${
            categoryError
              ? 'border-red-300 focus:border-red-500'
              : 'border-white/10 focus:border-brand-500'
          }`}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {categoryError && (
          <p className="flex items-center gap-1 text-sm text-red-300 font-medium mt-2">
            <AlertCircle className="w-4 h-4" />
            {categoryError}
          </p>
        )}
      </div>

      {/* Banner Image */}
      <div>
        <label className="block text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-brand-300" />
          Event Banner Image <span className="text-red-300">*</span>
        </label>
        <ImageUpload
          currentImage={formData.banner_image_url}
          onImageUploaded={(url) => onChange('banner_image_url', url)}
        />
        {imageError ? (
          <p className="flex items-center gap-1 text-sm text-red-300 font-medium mt-2">
            <AlertCircle className="w-4 h-4" />
            {imageError}
          </p>
        ) : formData.banner_image_url ? (
          <p className="flex items-center gap-1 text-sm text-emerald-300 font-medium mt-2">
            <CheckCircle className="w-4 h-4" />
            Image uploaded
          </p>
        ) : null}
        <p className="text-xs text-white/50 mt-2">
          Recommended: 1200x630px, JPG or PNG, max 5MB
        </p>
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
    </div>
  )
}
