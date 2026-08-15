import type { ReactNode } from 'react'

/**
 * Every admin page's header and padding. The title is the console's single
 * Instrument Serif moment — routing all pages through here is what keeps it to
 * one per page.
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(22px,3vw,30px)] leading-[1.06] text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-white/70">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
