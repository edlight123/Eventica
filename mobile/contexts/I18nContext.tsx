import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import en from '../locales/en'
import fr from '../locales/fr'
import ht from '../locales/ht'

export type Language = 'en' | 'fr' | 'ht'

type Dict = Record<string, any>

const STORAGE_KEY = 'tikem:language'

const DICTS: Record<Language, Dict> = { en: en as any, fr: fr as any, ht: ht as any }

function getByPath(obj: any, path: string): string | null {
  const parts = path.split('.').filter(Boolean)
  let cur: any = obj
  for (const p of parts) {
    cur = cur?.[p]
    if (cur == null) return null
  }
  return typeof cur === 'string' ? cur : null
}

/** Replace {placeholders} — used by copy that names the active location. */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] != null ? String(params[name]) : match
  )
}

type I18nContextValue = {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({} as any)

export function useI18n() {
  return useContext(I18nContext)
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'fr' || v === 'ht') setLanguageState(v)
      })
      .catch(() => {})
  }, [])

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang)
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
  }

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTS[language] || en
    return {
      language,
      setLanguage,
      t: (key: string, params?: Record<string, string | number>) => {
        const localized = getByPath(dict, key)
        if (localized) return interpolate(localized, params)
        const fallback = getByPath(en, key)
        return fallback ? interpolate(fallback, params) : key
      },
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
