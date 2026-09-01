import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import commonEn from '@/public/locales/en/common.json'
import commonFr from '@/public/locales/fr/common.json'
import commonHt from '@/public/locales/ht/common.json'

import authEn from '@/public/locales/en/auth.json'
import authFr from '@/public/locales/fr/auth.json'
import authHt from '@/public/locales/ht/auth.json'

import eventsEn from '@/public/locales/en/events.json'
import eventsFr from '@/public/locales/fr/events.json'
import eventsHt from '@/public/locales/ht/events.json'

import profileEn from '@/public/locales/en/profile.json'
import profileFr from '@/public/locales/fr/profile.json'
import profileHt from '@/public/locales/ht/profile.json'

import adminEn from '@/public/locales/en/admin.json'
import adminFr from '@/public/locales/fr/admin.json'
import adminHt from '@/public/locales/ht/admin.json'

import ticketsEn from '@/public/locales/en/tickets.json'
import ticketsFr from '@/public/locales/fr/tickets.json'
import ticketsHt from '@/public/locales/ht/tickets.json'

import notificationsEn from '@/public/locales/en/notifications.json'
import notificationsFr from '@/public/locales/fr/notifications.json'
import notificationsHt from '@/public/locales/ht/notifications.json'

import organizerEn from '@/public/locales/en/organizer.json'
import organizerFr from '@/public/locales/fr/organizer.json'
import organizerHt from '@/public/locales/ht/organizer.json'

import settingsEn from '@/public/locales/en/settings.json'
import settingsFr from '@/public/locales/fr/settings.json'
import settingsHt from '@/public/locales/ht/settings.json'

import dashboardEn from '@/public/locales/en/dashboard.json'
import dashboardFr from '@/public/locales/fr/dashboard.json'
import dashboardHt from '@/public/locales/ht/dashboard.json'

import favoritesEn from '@/public/locales/en/favorites.json'
import favoritesFr from '@/public/locales/fr/favorites.json'
import favoritesHt from '@/public/locales/ht/favorites.json'

import supportEn from '@/public/locales/en/support.json'
import supportFr from '@/public/locales/fr/support.json'
import supportHt from '@/public/locales/ht/support.json'

const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    events: eventsEn,
    profile: profileEn,
    admin: adminEn,
    tickets: ticketsEn,
    notifications: notificationsEn,
    organizer: organizerEn,
    settings: settingsEn,
    dashboard: dashboardEn,
    favorites: favoritesEn,
    support: supportEn,
  },
  fr: {
    common: commonFr,
    auth: authFr,
    events: eventsFr,
    profile: profileFr,
    admin: adminFr,
    tickets: ticketsFr,
    notifications: notificationsFr,
    organizer: organizerFr,
    settings: settingsFr,
    dashboard: dashboardFr,
    favorites: favoritesFr,
    support: supportFr,
  },
  ht: {
    common: commonHt,
    auth: authHt,
    events: eventsHt,
    profile: profileHt,
    admin: adminHt,
    tickets: ticketsHt,
    notifications: notificationsHt,
    organizer: organizerHt,
    settings: settingsHt,
    dashboard: dashboardHt,
    favorites: favoritesHt,
    support: supportHt,
  },
}

export const SUPPORTED_LNGS = ['en', 'fr', 'ht'] as const

// Shared init options. The cookie comes FIRST in detection (and is written on
// every language change) because it is the one store the server can also
// read — app/layout.tsx uses it to SSR the correct language, which is what
// keeps hydration from flashing English at fr/ht readers.
export const i18nOptions = {
  resources,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LNGS],
  defaultNS: 'common',
  ns: ['common', 'auth', 'events', 'profile', 'admin', 'tickets', 'notifications', 'organizer', 'settings', 'dashboard', 'favorites', 'support'],

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Show warnings for missing keys in development
  saveMissing: process.env.NODE_ENV === 'development',
  missingKeyHandler: (lng: any, ns: any, key: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Missing translation key: [${lng}][${ns}][${key}]`)
    }
  },

  interpolation: {
    escapeValue: false, // React already escapes values
  },

  detection: {
    order: ['cookie', 'localStorage', 'navigator'],
    caches: ['cookie', 'localStorage'],
    lookupCookie: 'i18nextLng',
    lookupLocalStorage: 'i18nextLng',
    cookieMinutes: 60 * 24 * 365,
  },
} as const

i18n.use(LanguageDetector).use(initReactI18next).init(i18nOptions as any)

export default i18n
