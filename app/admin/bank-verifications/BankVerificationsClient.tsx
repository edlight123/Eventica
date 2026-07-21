'use client'

import { useState, useEffect, useCallback } from 'react'
import BankVerificationReviewCard from '@/components/admin/BankVerificationReviewCard'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

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

export default function BankVerificationsClient() {
  const [verifications, setVerifications] = useState<BankVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchVerifications = useCallback(async (loadMore = false, currentCursor: string | null = null) => {
    try {
      setLoading(true)
      setLoadError(null)
      const params = new URLSearchParams({ status: statusFilter })
      if (loadMore && currentCursor) {
        params.append('cursor', currentCursor)
      }

      const response = await fetch(`/api/admin/bank-verifications?${params}`)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setLoadError(data.error || `Failed to load bank verifications (${response.status})`)
        if (!loadMore) setVerifications([])
        return
      }

      if (loadMore) {
        setVerifications((prev) => [...prev, ...(data.verifications || [])])
      } else {
        setVerifications(data.verifications || [])
      }

      setHasMore(data.hasMore)
      setCursor(data.nextCursor)
    } catch (error) {
      console.error('Error fetching verifications:', error)
      setLoadError(error instanceof Error ? error.message : 'Failed to load bank verifications')
      if (!loadMore) setVerifications([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchVerifications()
  }, [fetchVerifications])

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    setCursor(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <EditorialHeader
        tone="dark"
        title="Bank Verifications"
        subtitle="Review and approve bank account verification documents"
        className="mb-6"
      />

      {/* Status Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-brand-700 text-white'
                : 'border border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && verifications.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <p className="mt-4 text-white/60">Loading verifications...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && loadError && verifications.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="mb-4 text-sm text-red-300">{loadError}</p>
          <button
            onClick={() => fetchVerifications()}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.04] hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !loadError && verifications.length === 0 && (
        <div className="rounded-lg border border-white/10 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-white/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-white">
            No {statusFilter} verifications
          </h3>
          <p className="mt-1 text-white/50">
            There are no {statusFilter} bank verifications at this time.
          </p>
        </div>
      )}

      {/* Verifications List */}
      {verifications.length > 0 && (
        <div className="space-y-6">
          {verifications.map((verification, index) => (
            <BankVerificationReviewCard
              key={`${verification.organizerId}-${verification.destinationId}-${index}`}
              verification={verification}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchVerifications(true, cursor)}
            disabled={loading}
            className="px-6 py-3 bg-brand-700 text-white rounded-lg hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
