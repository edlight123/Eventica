'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmProvider'

// Helper to safely render any value - prevents React error #31 for objects
function safeString(value: any, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Safe date formatting to avoid hydration mismatches
function formatDate(dateStr: any, includeTime: boolean = true): string {
  if (!dateStr) return 'Unknown'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Unknown'
    // Use ISO format for consistency between server and client
    if (includeTime) {
      return date.toISOString().replace('T', ' ').slice(0, 19)
    }
    return date.toISOString().slice(0, 10)
  } catch {
    return 'Unknown'
  }
}

type OrganizerDetailsProps = {
  organizerDetails: {
    id: string
    user: any
    organizer: any
    payoutConfig: any
    payoutDestinations?: any[]
    verificationRequest: any
    verificationDocs: any[]
    stats: {
      totalEvents: number
      publishedEvents: number
      ticketsSold: number
    }
  }
}

export default function OrganizerDetailsClient({ organizerDetails }: OrganizerDetailsProps) {
  const { t } = useTranslation('admin')
  const confirmDialog = useConfirm()
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const { id, user, organizer, payoutConfig, payoutDestinations, verificationRequest, verificationDocs, stats } = organizerDetails

  const handleToggleStatus = async (action: 'ban' | 'unban' | 'disable_posting' | 'enable_posting') => {
    const actionLabel = action.replace('_', ' ')
    const isDestructive = action === 'ban' || action === 'disable_posting'
    const descriptions: Record<typeof action, string> = {
      ban: `${user.full_name || user.email || 'This organizer'} will lose access and their events will be hidden.`,
      unban: `${user.full_name || user.email || 'This organizer'} will regain access to their account.`,
      disable_posting: `${user.full_name || user.email || 'This organizer'} will no longer be able to create or publish events.`,
      enable_posting: `${user.full_name || user.email || 'This organizer'} will be able to create and publish events again.`,
    }
    const ok = await confirmDialog({
      title: `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} this organizer?`,
      description: descriptions[action],
      confirmLabel: actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1),
      variant: isDestructive ? 'danger' : 'default',
    })
    if (!ok) {
      return
    }

    setIsUpdating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/organizer-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizerId: id, action })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update organizer')
      }

      setMessage({ type: 'success', text: data.message })
      // Refresh page to show updated data
      window.location.reload()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setIsUpdating(false)
    }
  }

  const isBanned = user.status === 'banned'
  const canPost = user.can_create_events !== false

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href="/admin/organizers" className="text-sm font-medium text-white/50 hover:text-white">
          ← Back to Organizers
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-5 text-sm ${message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[clamp(22px,3vw,30px)] leading-[1.06] text-white">
            {user.full_name || 'No name'}
          </h1>
          <p className="mt-1 text-sm text-white/50">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
            <span className="text-brand-300">{user.role}</span>
            {user.verification_status === 'approved' && (
              <span className="text-emerald-300">✓ Verified</span>
            )}
            {isBanned && (
              <span className="text-red-300">✕ Banned</span>
            )}
            {!canPost && (
              <span className="text-amber-300">⚠ Posting Disabled</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 sm:min-w-[200px]">
          {isBanned ? (
            <button
              onClick={() => handleToggleStatus('unban')}
              disabled={isUpdating}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Unban Organizer
            </button>
          ) : (
            <button
              onClick={() => handleToggleStatus('ban')}
              disabled={isUpdating}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Ban Organizer
            </button>
          )}

          {canPost ? (
            <button
              onClick={() => handleToggleStatus('disable_posting')}
              disabled={isUpdating}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.04] disabled:opacity-50"
            >
              Disable Event Posting
            </button>
          ) : (
            <button
              onClick={() => handleToggleStatus('enable_posting')}
              disabled={isUpdating}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Enable Event Posting
            </button>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="mb-6 grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10">
        <div className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/50">
            <svg className="h-3.5 w-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Total Events
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-white">{stats.totalEvents}</div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/50">
            <svg className="h-3.5 w-3.5 text-white/30" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            Published Events
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-white">{stats.publishedEvents}</div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-white/50">
            <svg className="h-3.5 w-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            Tickets Sold
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-white">{stats.ticketsSold}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Account Information */}
        <div className="rounded-lg border border-white/10 p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Account Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-white/50">User ID</dt>
              <dd className="text-sm text-white font-mono break-all">{id}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Phone</dt>
              <dd className="text-sm text-white">{user.phone_number || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Account Status</dt>
              <dd className={`text-sm font-semibold ${isBanned ? 'text-red-300' : 'text-emerald-300'}`}>
                {isBanned ? 'Banned' : 'Active'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Can Create Events</dt>
              <dd className={`text-sm font-semibold ${canPost ? 'text-emerald-300' : 'text-red-300'}`}>
                {canPost ? 'Yes' : 'No'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Joined</dt>
              <dd className="text-sm text-white">{formatDate(user.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Last Updated</dt>
              <dd className="text-sm text-white">{formatDate(user.updated_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Bank Account & Verification */}
        <div className="rounded-lg border border-white/10 p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Bank Account & Payouts
          </h2>

          {(payoutConfig || (payoutDestinations && payoutDestinations.length > 0)) ? (
            <div className="space-y-4">
              {/* All Payout Destinations (Multiple Bank Accounts) */}
              {payoutDestinations && payoutDestinations.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-white/50">
                    Payout Destinations ({payoutDestinations.length})
                  </p>
                  {payoutDestinations.map((dest, index) => (
                    <div key={dest.id || index} className="rounded-lg border border-white/10 p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                        <span className="text-white/70">
                          {safeString(dest.type || 'bank').replace(/_/g, ' ')}
                        </span>
                        {(dest.isPrimary || dest.isDefault) && (
                          <span className="text-emerald-300">Primary</span>
                        )}
                        {dest.status && (
                          <span className={
                            dest.status === 'active' || dest.status === 'verified' ? 'text-emerald-300' :
                            dest.status === 'pending' ? 'text-amber-300' :
                            'text-red-300'
                          }>
                            {safeString(dest.status)}
                          </span>
                        )}
                      </div>

                      <dl className="space-y-1 text-sm">
                        {(dest.accountName || dest.bankDetails?.accountName) && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/50">Account Name</dt>
                            <dd className="text-white font-medium">{safeString(dest.accountName || dest.bankDetails?.accountName)}</dd>
                          </div>
                        )}
                        {(dest.bankName || dest.bankDetails?.bankName) && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/50">Bank</dt>
                            <dd className="text-white capitalize">{safeString(dest.bankName || dest.bankDetails?.bankName)}</dd>
                          </div>
                        )}
                        {(dest.accountNumberLast4 || dest.accountNumber || dest.bankDetails?.accountNumberLast4 || dest.bankDetails?.accountNumber) && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/50">Account #</dt>
                            <dd className="text-white font-mono">
                              ****{safeString(dest.accountNumberLast4 || dest.bankDetails?.accountNumberLast4 || dest.accountNumber || dest.bankDetails?.accountNumber)}
                            </dd>
                          </div>
                        )}
                        {(dest.routingNumber || dest.bankDetails?.routingNumber) && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/50">Routing #</dt>
                            <dd className="text-white font-mono">{safeString(dest.routingNumber || dest.bankDetails?.routingNumber)}</dd>
                          </div>
                        )}
                        {(dest.accountLocation || dest.bankDetails?.accountLocation) && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/50">Location</dt>
                            <dd className="text-white capitalize">{safeString(dest.accountLocation || dest.bankDetails?.accountLocation)}</dd>
                          </div>
                        )}
                        {(dest.provider || dest.mobileMoneyDetails?.provider) && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/50">Provider</dt>
                            <dd className="text-white">{safeString(dest.provider || dest.mobileMoneyDetails?.provider)}</dd>
                          </div>
                        )}
                        {(dest.phoneNumber || dest.mobileMoneyDetails?.phoneNumber) && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/50">Phone</dt>
                            <dd className="text-white font-mono">{safeString(dest.phoneNumber || dest.mobileMoneyDetails?.phoneNumber)}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy Bank Details from payoutConfig */}
              {payoutConfig?.bankDetails && !payoutDestinations?.length && (
                <div className="rounded-lg border border-white/10 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-white">
                      {safeString(payoutConfig.bankDetails?.accountName, 'N/A')}
                    </p>
                    <p className="mt-1 text-xs text-white/50">Account Holder</p>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Bank</dt>
                      <dd className="text-white font-medium">{safeString(payoutConfig.bankDetails?.bankName, 'N/A')}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Account Number</dt>
                      <dd className="text-white font-mono">
                        {typeof payoutConfig.bankDetails?.accountNumber === 'string' && payoutConfig.bankDetails.accountNumber
                          ? payoutConfig.bankDetails.accountNumber
                          : 'N/A'}
                      </dd>
                    </div>
                    {payoutConfig.bankDetails?.routingNumber && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-white/50">Routing Number</dt>
                        <dd className="text-white font-mono">{safeString(payoutConfig.bankDetails.routingNumber)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Location</dt>
                      <dd className="text-white">{safeString(payoutConfig.accountLocation || payoutConfig.bankDetails?.accountLocation, 'N/A')}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Verification Status */}
              {payoutConfig.verificationStatus && typeof payoutConfig.verificationStatus === 'object' && (
                <div className="rounded-lg border border-white/10 p-4">
                  <p className="mb-3 text-sm font-medium text-white">Verification Status</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                    {['identity', 'bank', 'phone'].map((type) => {
                      const status = payoutConfig.verificationStatus?.[type]
                      if (!status) return null
                      return (
                        <span
                          key={type}
                          className={
                            status === 'verified' ? 'text-emerald-300' :
                            status === 'failed' ? 'text-red-300' :
                            'text-amber-300'
                          }
                        >
                          {type}: {status}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Payout Status */}
              <div className="rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Payout Status</p>
                  <span className={`text-xs font-semibold ${
                    payoutConfig.status === 'active' ? 'text-emerald-300' :
                    payoutConfig.status === 'pending_verification' ? 'text-amber-300' :
                    payoutConfig.status === 'on_hold' ? 'text-red-300' :
                    'text-white/70'
                  }`}>
                    {safeString(payoutConfig.status, 'not_setup').replace(/_/g, ' ')}
                  </span>
                </div>
                {payoutConfig.method && (
                  <p className="mt-1 text-xs text-white/50">Method: {safeString(payoutConfig.method).replace(/_/g, ' ')}</p>
                )}
                {payoutConfig.payoutProvider && (
                  <p className="text-xs text-white/50">Provider: {safeString(payoutConfig.payoutProvider).replace(/_/g, ' ')}</p>
                )}
              </div>

              {/* Mobile Money Details */}
              {payoutConfig.mobileMoneyDetails && (
                <div className="rounded-lg border border-white/10 p-4">
                  <p className="mb-2 text-sm font-medium text-white">Mobile Money</p>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Provider</dt>
                      <dd className="text-white">{safeString(payoutConfig.mobileMoneyDetails.provider)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Phone</dt>
                      <dd className="text-white font-mono">{safeString(payoutConfig.mobileMoneyDetails.phoneNumber)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Account Name</dt>
                      <dd className="text-white">{safeString(payoutConfig.mobileMoneyDetails.accountName)}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Timestamps */}
              {(payoutConfig.createdAt || payoutConfig.updatedAt) && (
                <div className="space-y-1 text-xs text-white/50">
                  {payoutConfig.createdAt && (
                    <p>Created: {formatDate(payoutConfig.createdAt)}</p>
                  )}
                  {payoutConfig.updatedAt && (
                    <p>Updated: {formatDate(payoutConfig.updatedAt)}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <svg className="mx-auto mb-2 h-10 w-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-white/50">No payout configuration</p>
            </div>
          )}
        </div>

        {/* Verification Request */}
        {verificationRequest && (
          <div className="rounded-lg border border-white/10 p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Verification Request
            </h2>

            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-white/50">Status</dt>
                <dd className={`mt-1 text-sm font-semibold ${
                  safeString(verificationRequest.status) === 'approved' ? 'text-emerald-300' :
                  safeString(verificationRequest.status) === 'rejected' ? 'text-red-300' :
                  'text-amber-300'
                }`}>
                  {safeString(verificationRequest.status, 'pending')}
                </dd>
              </div>

              {verificationRequest.business_name && typeof verificationRequest.business_name === 'string' && (
                <div>
                  <dt className="text-xs text-white/50">Business Name</dt>
                  <dd className="text-sm text-white">{verificationRequest.business_name}</dd>
                </div>
              )}

              {verificationRequest.business_type && typeof verificationRequest.business_type === 'string' && (
                <div>
                  <dt className="text-xs text-white/50">Business Type</dt>
                  <dd className="text-sm text-white">{verificationRequest.business_type}</dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-white/50">Submitted</dt>
                <dd className="text-sm text-white">
                  {formatDate(verificationRequest.submitted_at || verificationRequest.createdAt)}
                </dd>
              </div>

              {verificationRequest.reviewed_at && (
                <div>
                  <dt className="text-xs text-white/50">Reviewed</dt>
                  <dd className="text-sm text-white">
                    {formatDate(verificationRequest.reviewed_at)}
                  </dd>
                </div>
              )}

              {verificationRequest.rejection_reason && typeof verificationRequest.rejection_reason === 'string' && (
                <div>
                  <dt className="text-xs text-white/50">Rejection Reason</dt>
                  <dd className="text-sm text-red-300">
                    {verificationRequest.rejection_reason}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Verification Documents */}
        {verificationDocs.length > 0 && (
          <div className="rounded-lg border border-white/10 p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Verification Documents ({verificationDocs.length})
            </h2>

            <div className="space-y-3">
              {verificationDocs.map((doc) => {
                const docType = doc.id || 'unknown'
                const docTypeLabel = docType.charAt(0).toUpperCase() + docType.slice(1)
                const status = typeof doc.status === 'string' ? doc.status : 'pending'

                return (
                  <div key={doc.id} className="rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {docType === 'identity' && (
                          <svg className="h-5 w-5 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                        )}
                        {docType === 'bank' && (
                          <svg className="h-5 w-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        )}
                        {docType === 'phone' && (
                          <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                        {!['identity', 'bank', 'phone'].includes(docType) && (
                          <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{docTypeLabel} Verification</p>
                          {doc.submittedAt && (
                            <p className="text-xs text-white/50">
                              Submitted {formatDate(doc.submittedAt, false)}
                            </p>
                          )}
                          {doc.uploadedAt && !doc.submittedAt && (
                            <p className="text-xs text-white/50">
                              Uploaded {formatDate(doc.uploadedAt, false)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold ${
                          status === 'verified' || status === 'approved' ? 'text-emerald-300' :
                          status === 'rejected' || status === 'failed' ? 'text-red-300' :
                          'text-amber-300'
                        }`}>
                          {status}
                        </span>
                        {(doc.url || doc.documentPath) && (
                          <button
                            onClick={async () => {
                              if (doc.url) {
                                window.open(doc.url, '_blank')
                              } else if (doc.documentPath) {
                                try {
                                  const res = await fetch(`/api/admin/verification-image?path=${encodeURIComponent(doc.documentPath)}`)
                                  const data = await res.json()
                                  if (data?.url) window.open(data.url, '_blank')
                                } catch (e) {
                                  console.error('Failed to open document:', e)
                                }
                              }
                            }}
                            className="text-xs font-medium text-brand-300 hover:text-white"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Organization Profile */}
        {organizer && (
          <div className="rounded-lg border border-white/10 p-4 sm:p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-white">Organization Profile</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {organizer.organization_name && (
                <div>
                  <dt className="text-xs text-white/50">Organization Name</dt>
                  <dd className="mt-1 text-sm text-white">{organizer.organization_name}</dd>
                </div>
              )}

              {organizer.business_type && (
                <div>
                  <dt className="text-xs text-white/50">Business Type</dt>
                  <dd className="mt-1 text-sm text-white">{organizer.business_type}</dd>
                </div>
              )}

              {organizer.website && (
                <div>
                  <dt className="text-xs text-white/50">Website</dt>
                  <dd className="mt-1 text-sm text-white">
                    <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:underline">
                      {organizer.website}
                    </a>
                  </dd>
                </div>
              )}

              {organizer.description && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-white/50">Description</dt>
                  <dd className="mt-1 text-sm text-white">{organizer.description}</dd>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
