'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, Trash2, AlertTriangle, HelpCircle, Briefcase } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AccountCardProps {
  onDeleteAccount?: () => Promise<void>
}

export function AccountCard({ onDeleteAccount }: AccountCardProps) {
  const { t } = useTranslation('profile')
  const { t: tCommon } = useTranslation('common')
  const router = useRouter()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * BUNDLE: firebase/auth is fetched in the handler, not imported at module
   * scope. Its only use in this card is this one signOut(), yet a static import
   * put the whole Firebase client — 444KB over three chunks (223 + 136 + 85) out
   * of ~988KB of shared JS — on /profile's first load. A route only sheds those
   * chunks when its LAST static importer goes, so please don't hoist it back up.
   * Cost at runtime: the first tap on "Sign out" awaits a chunk before the
   * session ends.
   */
  const handleSignOut = async () => {
    try {
      const [{ signOut }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/client'),
      ])
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      alert(t('account.sign_out_error'))
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert(t('account.delete_confirm_error'))
      return
    }

    setIsDeleting(true)
    try {
      if (onDeleteAccount) {
        await onDeleteAccount()
      } else {
        // Stub implementation
        alert(t('account.delete_error'))
      }
      setShowDeleteModal(false)
    } catch (error) {
      console.error('Error deleting account:', error)
      alert(t('account.delete_error'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="bg-white/[0.03] rounded-2xl shadow-sm border border-white/10 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">{t('account.title')}</h2>
          <p className="text-sm text-white/65">{t('account.subtitle')}</p>
        </div>

        <div className="space-y-3">
          {/* Staff (hidden from global nav; accessible from Profile) */}
          <Link
            href="/staff"
            className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.04] border border-white/10 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 bg-white/[0.04] group-hover:bg-white/[0.06] rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white/65" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-white">{tCommon('nav.staff')}</p>
              <p className="text-sm text-white/65">Staff tools and check-in</p>
            </div>
          </Link>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.04] border border-white/10 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 bg-white/[0.04] group-hover:bg-white/[0.06] rounded-lg flex items-center justify-center">
              <LogOut className="w-5 h-5 text-white/65" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-white">{t('account.sign_out')}</p>
              <p className="text-sm text-white/65">{t('account.sign_out_desc')}</p>
            </div>
          </button>

          {/* Help & Support */}
          <Link
            href="/support"
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-100 border border-brand-100 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 bg-brand-100 group-hover:bg-brand-200 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-white">{t('account.help_support')}</p>
              <p className="text-sm text-white/65">{t('account.help_support_desc')}</p>
            </div>
          </Link>

          {/* Delete Account */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-100 border border-red-200 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-red-300">{t('account.delete_account')}</p>
              <p className="text-sm text-red-300">{t('account.delete_account_desc')}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] rounded-2xl max-w-md w-full p-6">
            {/* Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {t('account.delete_modal_title')}
            </h3>
            <p className="text-white/65 text-center mb-6">
              {t('account.delete_modal_desc')}
            </p>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-white/70 mb-2">
                {t('account.delete_confirm_label')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder={t('account.delete_confirm_placeholder')}
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.06] text-white/70 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {t('account.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? t('account.deleting') : t('account.delete_button')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
