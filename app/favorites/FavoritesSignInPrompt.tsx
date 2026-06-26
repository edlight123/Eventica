'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'

export default function FavoritesSignInPrompt() {
  const { t } = useTranslation('favorites')

  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          {t('sign_in.title')}
        </h2>
        <Link
          href="/auth/login?redirect=/favorites"
          className="text-brand-300 hover:text-brand-200 font-medium"
        >
          {t('sign_in.action')}
        </Link>
      </div>
    </div>
  )
}
