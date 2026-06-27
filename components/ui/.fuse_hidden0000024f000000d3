'use client'

import { useEffect, ReactNode } from 'react'
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 flex-shrink-0">
              {title && (
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
                >
                  <X className="w-5 h-5 text-gray-500" />
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
