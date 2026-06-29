'use client'

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { ConfirmationDialog } from '@/components/organizer/ui/ConfirmationDialog'

export interface ConfirmOptions {
  title: string
  /** Supporting copy: state the impact and the affected record. */
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' = red destructive confirm; 'default' = brand teal. */
  variant?: 'default' | 'danger'
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Promise-based confirmation provider. Renders the shared dark ConfirmationDialog
 * and exposes `useConfirm()` returning `confirm(options) => Promise<boolean>`, a
 * drop-in replacement for `window.confirm` for destructive admin actions.
 *
 *   const confirmDialog = useConfirm()
 *   if (!(await confirmDialog({ title: 'Ban organizer?', variant: 'danger' }))) return
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '' })
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized = typeof options === 'string' ? { title: options } : options
    setOpts(normalized)
    setPending(false)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = useCallback((result: boolean) => {
    setOpen(false)
    setPending(false)
    const r = resolver.current
    resolver.current = null
    r?.(result)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmationDialog
        open={open}
        loading={pending}
        onClose={() => settle(false)}
        onConfirm={() => settle(true)}
        title={opts.title}
        description={opts.description}
        confirmLabel={opts.confirmLabel}
        cancelLabel={opts.cancelLabel}
        variant={opts.variant}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    // Fallback so a missing provider never breaks a destructive guard.
    return async (options) => {
      if (typeof window === 'undefined') return false
      const o = typeof options === 'string' ? { title: options } : options
      return window.confirm([o.title, o.description].filter(Boolean).join('\n\n'))
    }
  }
  return ctx
}
