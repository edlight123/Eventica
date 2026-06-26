'use client'

import { EventFormData, TabValidation } from '@/lib/event-validation'
import { AlertCircle, CheckCircle, MapPin, Globe } from 'lucide-react'
import { LOCATION_CONFIG } from '@/lib/filters/config'

interface LocationTabProps {
  formData: EventFormData
  onChange: (field: keyof EventFormData, value: any) => void
  validation: TabValidation
}

export function LocationTab({ formData, onChange, validation }: LocationTabProps) {
  const cityError = validation.missingFields.find(f => f.toLowerCase().includes('city'))
  const communeError = validation.missingFields.find(f => f.toLowerCase().includes('commune'))
  const venueError = validation.missingFields.find(f => f.toLowerCase().includes('venue'))
  const addressError = validation.missingFields.find(f => f.toLowerCase().includes('address'))
  const joinUrlError = validation.missingFields.find(f => f.toLowerCase().includes('join'))

  // Get cities for selected country (default to Haiti)
  const selectedCountry = formData.country || 'HT'
  const countries: Array<{ code: string; name: string }> = Object.values(LOCATION_CONFIG).map((c: any) => ({ code: c.code as string, name: c.name as string }))
  const cities = Object.keys(LOCATION_CONFIG[selectedCountry]?.cities || {})

  const handleCountryChange = (countryCode: string) => {
    onChange('country', countryCode)
    // Reset city when country changes
    const newCities = Object.keys(LOCATION_CONFIG[countryCode]?.cities || {})
    if (newCities.length > 0) {
      onChange('city', newCities[0])
    }
    onChange('commune', '')
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Section Header */}
      <div>
        <h2 className="font-display text-2xl text-gray-900 mb-2">Location Details</h2>
        <p className="text-gray-600">Where will your event take place?</p>
      </div>

      {/* Event Type Toggle */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Event Type <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => onChange('is_online', false)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
              !formData.is_online
                ? 'bg-brand-700 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-brand-300'
            }`}
          >
            <MapPin className="w-5 h-5" />
            In-Person
          </button>
          <button
            type="button"
            onClick={() => onChange('is_online', true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
              formData.is_online
                ? 'bg-brand-700 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-brand-300'
            }`}
          >
            <Globe className="w-5 h-5" />
            Online
          </button>
        </div>
      </div>

      {/* Country Selection */}
      <div>
        <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
          Country <span className="text-red-600">*</span>
        </label>
        <select
          id="country"
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
        >
          {countries.map((country: { code: string; name: string }) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* City & Commune */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
            City <span className="text-red-600">*</span>
          </label>
          <select
            id="city"
            value={formData.city}
            onChange={(e) => onChange('city', e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-brand-500 transition-all ${
              cityError
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-200 focus:border-brand-500'
            }`}
          >
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          {cityError && (
            <p className="flex items-center gap-1 text-sm text-red-600 font-medium mt-2">
              <AlertCircle className="w-4 h-4" />
              {cityError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="commune" className="block text-sm font-semibold text-gray-700 mb-2">
            Commune/Subarea <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="commune"
            value={formData.commune}
            onChange={(e) => onChange('commune', e.target.value)}
            placeholder="e.g., Pétion-Ville"
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-brand-500 transition-all ${
              communeError
                ? 'border-red-300 focus:border-red-500'
                : formData.commune
                ? 'border-green-300 focus:border-green-500'
                : 'border-gray-200 focus:border-brand-500'
            }`}
          />
          {communeError ? (
            <p className="flex items-center gap-1 text-sm text-red-600 font-medium mt-2">
              <AlertCircle className="w-4 h-4" />
              {communeError}
            </p>
          ) : formData.commune ? (
            <p className="flex items-center gap-1 text-sm text-green-700 font-medium mt-2">
              <CheckCircle className="w-4 h-4" />
              Looks good
            </p>
          ) : null}
        </div>
      </div>

      {/* In-Person Event Fields */}
      {!formData.is_online && (
        <>
          <div>
            <label htmlFor="venue_name" className="block text-sm font-semibold text-gray-700 mb-2">
              Venue Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="venue_name"
              value={formData.venue_name}
              onChange={(e) => onChange('venue_name', e.target.value)}
              placeholder="e.g., National Stadium"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-brand-500 transition-all ${
                venueError
                  ? 'border-red-300 focus:border-red-500'
                  : formData.venue_name
                  ? 'border-green-300 focus:border-green-500'
                  : 'border-gray-200 focus:border-brand-500'
              }`}
            />
            {venueError ? (
              <p className="flex items-center gap-1 text-sm text-red-600 font-medium mt-2">
                <AlertCircle className="w-4 h-4" />
                {venueError}
              </p>
            ) : formData.venue_name ? (
              <p className="flex items-center gap-1 text-sm text-green-700 font-medium mt-2">
                <CheckCircle className="w-4 h-4" />
                Looks good
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
              Full Address <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder="e.g., 123 Rue de la République"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-brand-500 transition-all ${
                addressError
                  ? 'border-red-300 focus:border-red-500'
                  : formData.address
                  ? 'border-green-300 focus:border-green-500'
                  : 'border-gray-200 focus:border-brand-500'
              }`}
            />
            {addressError ? (
              <p className="flex items-center gap-1 text-sm text-red-600 font-medium mt-2">
                <AlertCircle className="w-4 h-4" />
                {addressError}
              </p>
            ) : formData.address ? (
              <p className="flex items-center gap-1 text-sm text-green-700 font-medium mt-2">
                <CheckCircle className="w-4 h-4" />
                Looks good
              </p>
            ) : null}
            <p className="text-xs text-gray-500 mt-2">
              Include street number, street name, and any landmarks
            </p>
          </div>
        </>
      )}

      {/* Online Event Fields */}
      {formData.is_online && (
        <div>
          <label htmlFor="join_url" className="block text-sm font-semibold text-gray-700 mb-2">
            Online Event Link/URL <span className="text-red-600">*</span>
          </label>
          <input
            type="url"
            id="join_url"
            value={formData.join_url || ''}
            onChange={(e) => onChange('join_url', e.target.value)}
            placeholder="https://zoom.us/j/... or https://meet.google.com/..."
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-brand-500 transition-all ${
              joinUrlError
                ? 'border-red-300 focus:border-red-500'
                : formData.join_url
                ? 'border-green-300 focus:border-green-500'
                : 'border-gray-200 focus:border-brand-500'
            }`}
          />
          {joinUrlError ? (
            <p className="flex items-center gap-1 text-sm text-red-600 font-medium mt-2">
              <AlertCircle className="w-4 h-4" />
              {joinUrlError}
            </p>
          ) : formData.join_url ? (
            <p className="flex items-center gap-1 text-sm text-green-700 font-medium mt-2">
              <CheckCircle className="w-4 h-4" />
              Looks good
            </p>
          ) : null}
          <p className="text-xs text-gray-500 mt-2">
            Zoom, Google Meet, Teams, or custom streaming link
          </p>
        </div>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Suggestions
          </p>
          <ul className="list-disc list-inside space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-amber-800">{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
