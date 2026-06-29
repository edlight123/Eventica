'use client'

import { useState } from 'react'
import { Check, X, FileText, CreditCard, AlertCircle, ExternalLink } from 'lucide-react'
import { StatusChip } from '@/components/ui/kit'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { useToast } from '@/components/ui/Toast'

interface BankVerification {
  organizerId: string
  organizerName: string
  organizerEmail: string
  destinationId: string
  isPrimary?: boolean
  bankDetails: {
    accountName: string
    accountNumber: string
    bankName: string
    routingNumber?: string
  }
  verificationDoc: {
    type: string
    verificationType: string
    status: string
    submittedAt: string
    documentPath?: string
    documentName: string
    documentSize: number
  }
}

interface Props {
  verification: BankVerification
}

export default function BankVerificationReviewCard({ verification }: Props) {
  const confirmDialog = useConfirm()
  const { showToast } = useToast()
  const [processing, setProcessing] = useState(false)
  const [expanded, setExpanded] = useState(verification.verificationDoc.status === 'pending')
  const [isOpeningDocument, setIsOpeningDocument] = useState(false)

  const openDocument = async () => {
    const path = verification.verificationDoc.documentPath
    if (!path) return

    setIsOpeningDocument(true)
    try {
      const res = await fetch(`/api/admin/verification-image?path=${encodeURIComponent(path)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to open document')
      if (!data?.url) throw new Error('Signed URL missing')

      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Action failed',
        message: e instanceof Error ? e.message : 'Failed to open document',
      })
    } finally {
      setIsOpeningDocument(false)
    }
  }

  const handleApprove = async () => {
    const ok = await confirmDialog({
      title: 'Approve this bank account verification?',
      description: `Payouts to ${verification.organizerName}'s ${verification.bankDetails.bankName} account will be enabled.`,
      confirmLabel: 'Approve',
      variant: 'default',
    })
    if (!ok) return

    setProcessing(true)
    try {
      const response = await fetch('/api/admin/approve-bank-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: verification.organizerId,
          destinationId: verification.destinationId,
          decision: 'approve',
        }),
      })

      const data = await response.json().catch(() => ({} as any))
      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to approve')
      }

      showToast({
        type: 'success',
        title: 'Verification approved',
        message: 'Bank verification approved!',
      })
      window.location.reload()
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Action failed',
        message: 'Failed to approve verification',
      })
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Reason for rejection (will be sent to organizer):')
    if (!reason) return

    setProcessing(true)
    try {
      const response = await fetch('/api/admin/approve-bank-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: verification.organizerId,
          destinationId: verification.destinationId,
          decision: 'reject',
          reason,
        }),
      })

      const data = await response.json().catch(() => ({} as any))
      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to reject')
      }

      showToast({
        type: 'success',
        title: 'Verification rejected',
        message: 'Bank verification rejected',
      })
      window.location.reload()
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Action failed',
        message: 'Failed to reject verification',
      })
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = () => {
    switch (verification.verificationDoc.status) {
      case 'verified':
        return (
          <StatusChip tone="success" icon={Check}>
            Verified
          </StatusChip>
        )
      case 'failed':
        return (
          <StatusChip tone="danger" icon={X}>
            Failed
          </StatusChip>
        )
      default:
        return (
          <StatusChip tone="warning" icon={AlertCircle}>
            Pending Review
          </StatusChip>
        )
    }
  }

  const getDocumentTypeLabel = () => {
    switch (verification.verificationDoc.verificationType) {
      case 'bank_statement':
        return 'Bank Statement'
      case 'void_check':
        return 'Voided Check'
      case 'utility_bill':
        return 'Utility Bill + Bank Letter'
      default:
        return verification.verificationDoc.verificationType
    }
  }

  return (
    <div className="bg-[#0a0a0a] rounded-2xl border-2 border-white/10 overflow-hidden">
      {/* Header - Always Visible */}
      <div
        className="p-6 cursor-pointer hover:bg-white/[0.04] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-white">{verification.organizerName}</h3>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-white/60">{verification.organizerEmail}</p>
            <p className="text-xs text-white/50 mt-1">
              Bank account: {verification.isPrimary ? 'Primary' : 'Additional'} ({verification.destinationId})
            </p>
            <p className="text-xs text-white/50 mt-1">
              Submitted {new Date(verification.verificationDoc.submittedAt).toLocaleString()}
            </p>
          </div>
          <div className="text-2xl text-white/50">
            {expanded ? '−' : '+'}
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {expanded && (
        <div className="border-t border-white/10 p-6 bg-[#0a0a0a]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Bank Details Submitted */}
            <div className="bg-[#0a0a0a] rounded-xl p-6 border-2 border-brand-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-brand-300" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Bank Account Details</h4>
                  <p className="text-xs text-white/50">Information provided by organizer</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                    Bank Name
                  </div>
                  <div className="text-base font-medium text-white">
                    {verification.bankDetails.bankName}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                    Account Holder Name
                  </div>
                  <div className="text-base font-medium text-white">
                    {verification.bankDetails.accountName}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                    Account Number
                  </div>
                  <div className="text-base font-mono font-medium text-white">
                    {verification.bankDetails.accountNumber}
                  </div>
                </div>

                {verification.bankDetails.routingNumber && (
                  <div>
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                      Routing Number
                    </div>
                    <div className="text-base font-mono font-medium text-white">
                      {verification.bankDetails.routingNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Proof Document */}
            <div className="bg-[#0a0a0a] rounded-xl p-6 border-2 border-brand-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-brand-300" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Proof Document</h4>
                  <p className="text-xs text-white/50">Document submitted for verification</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                    Document Type
                  </div>
                  <div className="text-base font-medium text-white">
                    {getDocumentTypeLabel()}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                    File Name
                  </div>
                  <div className="text-sm font-medium text-white break-all">
                    {verification.verificationDoc.documentName}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                    File Size
                  </div>
                  <div className="text-base font-medium text-white">
                    {(verification.verificationDoc.documentSize / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                {/* In production, this would be a Firebase Storage URL */}
                <div className="pt-3">
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold transition-colors"
                    onClick={openDocument}
                    disabled={!verification.verificationDoc.documentPath || isOpeningDocument}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {isOpeningDocument ? 'Opening…' : 'View Document'}
                  </button>
                  <p className="text-xs text-white/50 text-center mt-2">
                    {verification.verificationDoc.documentPath
                      ? 'Opens a secure, time-limited link to the uploaded proof.'
                      : 'Document unavailable (older submission)'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Instructions */}
          <div className="mt-6 p-4 border border-amber-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-300">
                <p className="font-semibold mb-2">Review Checklist:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Bank name matches between form and document</li>
                  <li>Account holder name matches (or is similar)</li>
                  <li>Account number visible in document and matches</li>
                  <li>Document is recent (less than 3 months old)</li>
                  <li>Document appears authentic (not edited/fake)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          {verification.verificationDoc.status === 'pending' && (
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-[#0a0a0a] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" />
                {processing ? 'Processing...' : 'Approve Verification'}
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-[#0a0a0a] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
                {processing ? 'Processing...' : 'Reject Verification'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
