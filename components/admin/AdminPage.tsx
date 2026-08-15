import type { ReactNode } from 'react'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

/**
 * Every admin page's header and page padding.
 *
 * The title delegates to EditorialHeader rather than rendering its own <h1>:
 * that component already provides the serif display title used across the
 * admin and organizer surfaces, and 10 of the 15 admin pages were already
 * using it. Reimplementing the heading here would have meant two slightly
 * different serif titles depending on which page you were on — the opposite of
 * the point.
 *
 * What this adds over EditorialHeader alone is the shared page container, so
 * every admin route has the same max width and padding.
 */
export function AdminPage({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <EditorialHeader title={title} subtitle={description} actions={action} className="mb-6" />
      {children}
    </div>
  )
}
