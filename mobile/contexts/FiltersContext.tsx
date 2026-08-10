import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventFilters, DEFAULT_FILTERS } from '../types/filters';
import { useAuth } from './AuthContext';
import { getDeviceLocationInfo, getSupportedCountry, isSupportedCountry } from '../utils/deviceLocation';

// Last country the app actually resolved to (profile or explicit user choice).
// Hydrated on launch so the header/fetch never start from a locale guess the
// user has already corrected.
const RESOLVED_COUNTRY_KEY = 'resolved_user_country';

interface FiltersContextType {
  // Current applied filters
  appliedFilters: EventFilters;
  
  // Draft filters (being edited in modal)
  draftFilters: EventFilters;
  
  // Modal state
  isModalOpen: boolean;
  
  // User's default country (persisted > profile > device locale > HT)
  userCountry: string;

  // False until the country has been hydrated (persisted value / profile /
  // device locale). Consumers should hold their first country-filtered fetch
  // until this is true, or they will query with a placeholder country.
  countryResolved: boolean;

  // Actions
  setDraftFilters: (filters: EventFilters) => void;
  openFiltersModal: () => void;
  closeFiltersModal: () => void;
  applyFilters: () => void;
  applyFiltersDirectly: (filters: EventFilters) => void; // Apply filters directly without draft
  resetFilters: () => void;
  setUserCountry: (country: string) => void;
  
  // Utilities
  hasActiveFilters: () => boolean;
  countActiveFilters: () => number;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  
  // Start from the product's home market, NOT the device locale. A phone that
  // is physically in Haiti but set to English (US) reports region "US", which
  // painted "UNITED STATES" in the Home header and ran the first events fetch
  // with the wrong country. The real value is hydrated asynchronously below
  // (persisted > profile > device locale > HT) before consumers fetch.
  const [userCountry, setUserCountryState] = useState<string>('HT');
  const [countryResolved, setCountryResolved] = useState(false);
  // Once the profile (authoritative) or an explicit user choice has set the
  // country, a slower hydration read must not overwrite it.
  const explicitCountryRef = useRef(false);
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>({
    ...DEFAULT_FILTERS,
    country: 'HT',
  });
  const [draftFilters, setDraftFilters] = useState<EventFilters>({
    ...DEFAULT_FILTERS,
    country: 'HT',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const applyCountry = (country: string) => {
    setUserCountryState(country);
    setAppliedFilters(prev => ({ ...prev, country }));
    setDraftFilters(prev => ({ ...prev, country }));
  };

  // Hydrate the last-resolved country before the first fetch. The persisted
  // value wins for first paint; the profile effect below refines it when the
  // profile loads (and re-persists it).
  useEffect(() => {
    (async () => {
      try {
        const persisted = await AsyncStorage.getItem(RESOLVED_COUNTRY_KEY);
        if (!explicitCountryRef.current) {
          if (persisted && isSupportedCountry(persisted)) {
            applyCountry(persisted);
          } else {
            // First-ever launch (or post sign-out storage clear): fall back to
            // the device locale as a guess. Deliberately NOT persisted — only a
            // profile or an explicit user choice makes a country stick, because
            // the locale guess is exactly what can be wrong (US-locale phones
            // in Haiti). LocationDetectionBanner offers the correction.
            applyCountry(getDeviceLocationInfo().country);
          }
        }
      } catch (error) {
        console.error('[FiltersContext] Country hydration failed:', error);
      } finally {
        setCountryResolved(true);
      }
    })();
  }, []);

  // Update filters when user profile loads (profile country takes precedence)
  useEffect(() => {
    if (userProfile?.default_country) {
      const profileCountry = getSupportedCountry(userProfile.default_country);
      console.log('[FiltersContext] Setting country from profile:', profileCountry);
      explicitCountryRef.current = true;
      applyCountry(profileCountry);
      setCountryResolved(true);
      AsyncStorage.setItem(RESOLVED_COUNTRY_KEY, profileCountry).catch(() => {});
    }
  }, [userProfile?.default_country]);

  // Exposed setter (location banner, settings): an explicit choice, so it
  // sticks across launches.
  const setUserCountry = (country: string) => {
    const supported = getSupportedCountry(country);
    explicitCountryRef.current = true;
    setUserCountryState(supported);
    AsyncStorage.setItem(RESOLVED_COUNTRY_KEY, supported).catch(() => {});
  };

  const openFiltersModal = () => {
    // Copy current applied filters to draft when opening
    setDraftFilters({ ...appliedFilters });
    setIsModalOpen(true);
  };

  const closeFiltersModal = () => {
    // Revert draft to applied filters when closing without applying
    setDraftFilters({ ...appliedFilters });
    setIsModalOpen(false);
  };

  const applyFilters = () => {
    // Apply draft filters and close modal
    setAppliedFilters({ ...draftFilters });
    setIsModalOpen(false);
  };

  const applyFiltersDirectly = (filters: EventFilters) => {
    // Apply filters directly, bypassing draft state
    // Useful for programmatic filter application (e.g., category navigation)
    setAppliedFilters(filters);
    setDraftFilters(filters);
  };

  const resetFilters = () => {
    // Reset to defaults but keep the user's country
    const resetWithCountry = { ...DEFAULT_FILTERS, country: userCountry };
    setAppliedFilters(resetWithCountry);
    setDraftFilters(resetWithCountry);
    setIsModalOpen(false);
  };

  const hasActiveFilters = (): boolean => {
    return countActiveFilters() > 0;
  };

  const countActiveFilters = (): number => {
    let count = 0;
    
    if (appliedFilters.date !== DEFAULT_FILTERS.date) count++;
    // Don't count country as an "active filter" since it's auto-set
    if (appliedFilters.city !== DEFAULT_FILTERS.city) count++;
    if (appliedFilters.categories.length > 0) count++;
    if (appliedFilters.price !== DEFAULT_FILTERS.price) count++;
    if (appliedFilters.eventType !== DEFAULT_FILTERS.eventType) count++;
    
    return count;
  };

  return (
    <FiltersContext.Provider
      value={{
        appliedFilters,
        draftFilters,
        isModalOpen,
        userCountry,
        countryResolved,
        setDraftFilters,
        openFiltersModal,
        closeFiltersModal,
        applyFilters,
        applyFiltersDirectly,
        resetFilters,
        setUserCountry,
        hasActiveFilters,
        countActiveFilters
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
