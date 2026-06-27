'use client'

import { Download, FileText, Calendar } from 'lucide-react'
import Image from 'next/image'

interface PayoutReceiptViewerProps {
  receiptUrl: string
  uploadedBy?: string
  uploadedAt?: string
  paymentReferenceId?: string
  compact?: boolean
}

export default function PayoutReceiptViewer({
  receiptUrl,
  uploadedBy,
  uploadedAt,
  paymentReferenceId,
  compact = false
}: PayoutReceiptViewerProps) {
  const isPDF = receiptUrl.includes('.pdf')

  if (compact) {
    return (
      <a
        href={receiptUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-300 hover:underline"
      >
        <Download className="w-4 h-4" />
        View Receipt
      </a>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-[#141414]">
      {/* Header */}
      <div className="bg-[#0a0a0a] px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-white/60" />
          <span className="font-medium text-white">Payment Receipt</span>
        </div>
        <a
          href={receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-300"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      </div>

      {/* Receipt Preview */}
      <div className="p-4">
        {isPDF ? (
          <div className="flex items-center justify-center gap-3 p-8 bg-[#0a0a0a] rounded border-2 border-dashed border-white/10">
            <FileText className="w-12 h-12 text-red-500" />
            <div>
              <p className="font-medium text-white">PDF Receipt</p>
              <p className="text-sm text-white/50">Click download to view</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-96 bg-[#1c1c1c] rounded">
            <Image
              src={receiptUrl}
              alt="Payment receipt"
              fill
              className="object-contain rounded"
            />
          </div>
        )}
      </div>

      {/* Metadata */}
      {(uploadedAt || paymentReferenceId) && (
        <div className="px-4 pb-4 space-y-2 text-sm">
          {paymentReferenceId && (
            <div className="flex items-center gap-2 text-white/60">
              <span className="font-medium">Reference ID:</span>
              <span className="font-mono bg-[#1c1c1c] px-2 py-0.5 rounded">
                {paymentReferenceId}
              </span>
            </div>
          )}
          {uploadedAt && (
            <div className="flex items-center gap-2 text-white/50">
              <Calendar className="w-4 h-4" />
              <span>Uploaded: {new Date(uploadedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
