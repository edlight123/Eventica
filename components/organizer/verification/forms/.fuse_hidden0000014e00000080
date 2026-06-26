/**
 * OrganizerInfoForm Component
 * Form for organizer personal information
 */

'use client'

import { useState } from 'react'

interface Props {
  initialData: Record<string, any>
  onSave: (data: Record<string, any>) => Promise<void>
  onCancel: () => void
}

export default function OrganizerInfoForm({ initialData, onSave, onCancel }: Props) {
  const [formData, setFormData] = useState({
    full_name: initialData.full_name || '',
    phone: initialData.phone || '',
    organization_name: initialData.organization_name || '',
    organization_type: initialData.organization_type || 'individual',
    email: initialData.email || '',
    address: initialData.address || '',
    city: initialData.city || '',
    country: initialData.country || 'Haiti'
  })

  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    const normalizedPhone = String(formData.phone || '').replace(/[\s\-()]/g, '')

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+?\d{10,}$/.test(normalizedPhone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    if (!formData.organization_name.trim()) {
      newErrors.organization_name = 'Organization name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      setIsSaving(true)
      await onSave(formData)
    } catch (error: any) {
      setErrors({ _form: error.message || 'Failed to save' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-6">
          Organizer Information
        </h3>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                errors.full_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="John Doe"
            />
            {errors.full_name && (
              <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="+509 1234 5678"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="john@example.com"
            />
          </div>

          {/* Organization Name */}
          <div>
            <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700 mb-2">
              Organization/Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="organization_name"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                errors.organization_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Your Company Name"
            />
            {errors.organization_name && (
              <p className="mt-1 text-sm text-red-600">{errors.organization_name}</p>
            )}
          </div>

          {/* Organization Type */}
          <div>
            <label htmlFor="organization_type" className="block text-sm font-medium text-gray-700 mb-2">
              Organization Type
            </label>
            <select
              id="organization_type"
              name="organization_type"
              value={formData.organization_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="individual">Individual/Sole Proprietor</option>
              <option value="company">Company/Corporation</option>
              <option value="nonprofit">Non-Profit Organization</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Street address"
            />
          </div>

          {/* City & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Port-au-Prince"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="Haiti">Haiti</option>
                <option value="Dominican Republic">Dominican Republic</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Error */}
        {errors._form && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{errors._form}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </form>
  )
}
