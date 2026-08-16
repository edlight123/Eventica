import type { ReactNode } from 'react'
import { ConsolePage } from '@/components/admin/console'

/**
 * Back-compat alias for pages written against the earlier shell. New code uses
 * ConsolePage directly; this keeps the {title, description, action} shape and
 * renders the Control Room header — mono caps, no serif. The console does not
 * share the public site's editorial language.
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
    <ConsolePage title={title} sub={description} action={action}>
      {children}
    </ConsolePage>
  )
}
