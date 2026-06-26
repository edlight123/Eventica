'use client';

import { useState, useMemo } from 'react';
import { MapPin, Globe, Clock, DollarSign, Tag, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LOCATION_CONFIG, getCitiesForCountry } from '@/lib/filters/config';

interface DefaultsFormProps {
  userId: string;
  initialData: {
    default_city: string;
    default_country: string;
    default_timezone: string;
    default_currency: string;
    default_categories: string[];
  };
}

const CATEGORIES = [
  'Music', 'Arts & Culture', 'Sports', 'Food & Drink', 'Business',
  'Education', 'Charity', 'Community', 'Family', 'Technology'
];

const TIMEZONES = [
  { value: 'America/Port-au-Prince', label: 'Haiti Time (EST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const CURRENCIES = [
  { value: 'HTG', label: 'Haitian Gourde (HTG)', symbol: 'G' },
  { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
];

export default function DefaultsForm({ userId, initialData }: DefaultsFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // Get cities for selected country
  const cities = useMemo(() => {
    return getCitiesForCountry(formData.default_country || 'HT');
  }, [formData.default_country]);

  // Get list of countries
  const countries = useMemo(() => {
    return Object.values(LOCATION_CONFIG).map(country => ({
      code: country.code,
      name: country.name
    }));
  }, []);

  const handleCountryChange = (countryCode: string) => {
    setFormData({
      ...formData,
      default_country: countryCode,
      default_city: '', // Reset city when country changes
    });
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      default_categories: prev.default_categories.includes(category)
        ? prev.default_categories.filter((c) => c !== category)
        : [...prev.default_categories, category],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organizer/settings/defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update defaults');
      }

      showToast({
        title: 'Defaults updated',
        message: 'Your event defaults have been successfully updated.',
        type: 'success',
      });
    } catch (error) {
      console.error('Error updating defaults:', error);
      showToast({
        title: 'Error',
        message: 'Failed to update defaults. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Country */}
        <div>
          <label htmlFor="default_country" className="block text-sm font-medium text-gray-700 mb-2">
            Default Country
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              id="default_country"
              value={formData.default_country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
            >
              <option value="">Select a country</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* City */}
        <div>
          <label htmlFor="default_city" className="block text-sm font-medium text-gray-700 mb-2">
            Default City
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              id="default_city"
              value={formData.default_city}
              onChange={(e) => setFormData({ ...formData, default_city: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
              disabled={!formData.default_country}
            >
              <option value="">Select a city</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          {!formData.default_country && (
            <p className="text-xs text-gray-500 mt-1">Select a country first</p>
          )}
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label htmlFor="default_timezone" className="block text-sm font-medium text-gray-700 mb-2">
          Default Timezone
        </label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            id="default_timezone"
            value={formData.default_timezone}
            onChange={(e) => setFormData({ ...formData, default_timezone: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Currency */}
      <div>
        <label htmlFor="default_currency" className="block text-sm font-medium text-gray-700 mb-2">
          Default Currency
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            id="default_currency"
            value={formData.default_currency}
            onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Tag className="inline w-4 h-4 mr-1" />
          Default Categories
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryToggle(category)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                formData.default_categories.includes(category)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Select categories that best describe the types of events you typically organize
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Saving...' : 'Save Defaults'}
        </button>
      </div>
    </form>
  );
}
