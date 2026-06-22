'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Tag, Globe, Info } from 'lucide-react'
import { LOCATION_CONFIG, CATEGORIES, getLocationTypeLabel, getSubdivisions, getCitiesForCountry } from '@/lib/filters/config'
import type { UserProfile } from '@/lib/firestore/user-profile'

interface PreferencesCardProps {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
}

export function PreferencesCard({ profile, onUpdate }: PreferencesCardProps) {
  const { i18n, t } = useTranslation('profile')
  const [defaultCountry, setDefaultCountry] = useState(profile.defaultCountry || 'HT')
  const [defaultCity, setDefaultCity] = useState(profile.defaultCity || '')
  const [defaultSubarea, setDefaultSubarea] = useState(profile.defaultSubarea || '')
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>(profile.favoriteCategories || [])
  const [language, setLanguage] = useState(profile.language || 'en')
  const [isUpdating, setIsUpdating] = useState(false)

  // Get cities for selected country
  const cities = useMemo(() => {
    return getCitiesForCountry(defaultCountry)
  }, [defaultCountry])

  // Get current subdivisions based on selected city
  const subdivisions = useMemo(() => {
    return defaultCity ? getSubdivisions(defaultCity, defaultCountry) : []
  }, [defaultCity, defaultCountry])
  
  const subareaType = defaultCity && LOCATION_CONFIG[defaultCountry]?.cities[defaultCity]
    ? LOCATION_CONFIG[defaultCountry].cities[defaultCity].type.toUpperCase()
    : 'COMMUNE'
  const subareaLabel = defaultCity ? getLocationTypeLabel(defaultCity, defaultCountry) : 'Area'

  // Reset city and subarea when country changes
  useEffect(() => {
    const availableCities = getCitiesForCountry(defaultCountry)
    if (defaultCity && !availableCities.includes(defaultCity)) {
      setDefaultCity('')
      setDefaultSubarea('')
    }
  }, [defaultCountry, defaultCity])

  // Reset subarea when city changes
  useEffect(() => {
    if (defaultCity && !subdivisions.includes(defaultSubarea)) {
      setDefaultSubarea('')
    }
  }, [defaultCity, defaultSubarea, subdivisions])

  const handleCountryChange = async (country: string) => {
    setDefaultCountry(country)
    setDefaultCity('') // Reset city
    setDefaultSubarea('') // Reset subarea
    setIsUpdating(true)
    try {
      await onUpdate({ 
        defaultCountry: country,
        defaultCity: '',
        defaultSubarea: '',
        subareaType: 'COMMUNE'
      })
    } catch (error) {
      console.error('Failed to update country:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCityChange = async (city: string) => {
    setDefaultCity(city)
    setDefaultSubarea('') // Reset subarea
    setIsUpdating(true)
    try {
      const cityConfig = LOCATION_CONFIG[defaultCountry]?.cities[city]
      await onUpdate({ 
        defaultCity: city,
        defaultSubarea: '',
        subareaType: (cityConfig?.type.toUpperCase() || 'COMMUNE') as 'COMMUNE' | 'NEIGHBORHOOD'
      })
    } catch (error) {
      console.error('Failed to update city:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSubareaChange = async (subarea: string) => {
    setDefaultSubarea(subarea)
    setIsUpdating(true)
    try {
      await onUpdate({ defaultSubarea: subarea })
    } catch (error) {
      console.error('Failed to update subarea:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCategoryToggle = async (category: string) => {
    const newCategories = favoriteCategories.includes(category)
      ? favoriteCategories.filter(c => c !== category)
      : [...favoriteCategories, category]
    
    setFavoriteCategories(newCategories)
    setIsUpdating(true)
    try {
      await onUpdate({ favoriteCategories: newCategories })
    } catch (error) {
      console.error('Failed to update categories:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLanguageChange = async (lang: 'en' | 'fr' | 'ht') => {
    setLanguage(lang)
    setIsUpdating(true)
    try {
      // Update i18n language immediately for UI
      await i18n.changeLanguage(lang)
      // Persist to user profile
      await onUpdate({ language: lang })
    } catch (error) {
      console.error('Failed to update language:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('preferences.title')}</h2>
        <p className="text-sm text-gray-600">{t('preferences.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* Default Location Pill */}
        {defaultCountry && defaultCity && defaultSubarea && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
                  {t('preferences.default_location')}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {LOCATION_CONFIG[defaultCountry]?.name} • {defaultCity} • {defaultSubarea}
                </p>
                <p className="text-xs text-brand-600 mt-1">
                  {t('preferences.location_note')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Country Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Globe className="w-4 h-4" />
            {t('preferences.default_country', { defaultValue: 'Country' })}
          </label>
          <select
            value={defaultCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            disabled={isUpdating}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.values(LOCATION_CONFIG).map(country => (
              <option key={country.code} value={country.code}>{country.name}</option>
            ))}
          </select>
        </div>

        {/* City Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <MapPin className="w-4 h-4" />
            {t('preferences.default_city')}
          </label>
          <select
            value={defaultCity}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={isUpdating}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{t('preferences.select_city')}</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Subarea Selector */}
        {defaultCity && subdivisions.length > 0 && (
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              {subareaLabel}
            </label>
            <select
              value={defaultSubarea}
              onChange={(e) => handleSubareaChange(e.target.value)}
              disabled={isUpdating}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{t('preferences.select_area', { type: subareaLabel.toLowerCase() })}</option>
              {subdivisions.map(subarea => (
                <option key={subarea} value={subarea}>{subarea}</option>
              ))}
            </select>
          </div>
        )}

        {/* Favorite Categories */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Tag className="w-4 h-4" />
            {t('preferences.favorite_categories')}
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => {
              const isSelected = favoriteCategories.includes(category)
              return (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t('preferences.categories_note')}
          </p>
        </div>

        {/* Language Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Globe className="w-4 h-4" />
            {t('preferences.language')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { code: 'en' as const, label: t('preferences.language_en') },
              { code: 'fr' as const, label: t('preferences.language_fr') },
              { code: 'ht' as const, label: t('preferences.language_ht') }
            ].map(({ code, label }) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                disabled={isUpdating}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                  language === code
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
