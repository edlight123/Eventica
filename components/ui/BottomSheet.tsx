'use client'

import { useEffect, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  showCloseButton?: boolean
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
}: BottomSheetProps) {
  const { t } = useTranslation('common')
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* OPAQUE, and it must stay opaque: this panel floats over page content
            (the fixed parent above), so a translucent fill lets the page show
            straight through the sheet, text over text. That is exactly what
            happened when a surface sweep treated it as a card, which broke
            guest checkout. #111 lifts it off the page's own black. */}
        <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 flex-shrink-0">
              {title && (
                <h3 className="text-lg font-bold text-white">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  aria-label={t('common.close', { defaultValue: 'Close' })}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-white/[0.04] transition-colors ml-auto sm:h-9 sm:w-9"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
