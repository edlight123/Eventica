'use client'

import { useState, useEffect, useCallback } from 'react'
import BankVerificationReviewCard from '@/components/admin/BankVerificationReviewCard'
import Link from 'next/link'

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
  const [statusFilter, setStatusFilter] = useState('pending')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchVerifications = useCallback(async (loadMore = false, currentCursor: string | null = null) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ status: statusFilter })
      if (loadMore && currentCursor) {
        params.append('cursor', currentCursor)
      }

      const response = await fetch(`/api/admin/bank-verifications?${params}`)
      const data = await response.json()

      if (loadMore) {
        setVerifications((prev) => [...prev, ...data.verifications])
      } else {
        setVerifications(data.verifications)
      }

      setHasMore(data.hasMore)
      setCursor(data.nextCursor)
    } catch (error) {
      console.error('Error fetching verifications:', error)
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">Bank Verifications</h1>
        <p className="text-gray-600 mt-2">
          Review and approve bank account verification documents
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {['pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && verifications.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading verifications...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && verifications.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No {statusFilter} verifications
          </h3>
          <p className="mt-1 text-gray-500">
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
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
