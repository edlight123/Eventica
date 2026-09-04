'use client'

import React, { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' = red confirm button (destructive). 'default' = brand teal. */
  variant?: 'default' | 'danger'
  loading?: boolean
}

/**
 * Dark-canvas confirmation dialog for destructive or important actions.
 * Focus-trapped, Esc to close, accessible role/aria attributes.
 */
export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = 'org-confirm-title'
  const descId = 'org-confirm-desc'

  // Esc to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus cancel on open (safer default for destructive dialogs)
  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative w-full max-w-sm rounded-2xl bg-[#1e1e1e] p-6 shadow-2xl"
        style={{ animation: 'scaleIn 0.18s ease-out' }}
      >
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl ">
          <AlertTriangle
            className={`h-6 w-6 ${variant === 'danger' ? 'text-red-400' : 'text-brand-400'}`}
          />
        </div>

        <h2 id={titleId} className="font-display text-lg text-white">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-1.5 text-sm text-white/55">
            {description}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 flex-1 rounded-[10px] bg-white/[0.08] text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.14] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-11 flex-1 rounded-[10px] text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-brand-700 hover:bg-brand-800 focus-visible:ring-brand-500'
            }`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
