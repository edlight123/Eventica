'use client'

import { useTranslation } from 'react-i18next'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

interface TicketsPageClientProps {
  userId: string
  children: React.ReactNode
}

export default function TicketsPageClient({ userId, children }: TicketsPageClientProps) {
  const { t } = useTranslation('tickets')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <EditorialHeader title={t('title')} className="mb-6" tone="dark" />
      {children}
    </div>
  )
}
