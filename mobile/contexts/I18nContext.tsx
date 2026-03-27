import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import en from '../locales/en'
import fr from '../locales/fr'
import ht from '../locales/ht'

export type Language = 'en' | 'fr' | 'ht'

type Dict = Record<string, any>

const STORAGE_KEY = 'eventica:language'

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

type I18nContextValue = {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string) => string
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
      t: (key: string) => {
        const localized = getByPath(dict, key)
        if (localized) return localized
        const fallback = getByPath(en, key)
        return fallback || key
      },
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
