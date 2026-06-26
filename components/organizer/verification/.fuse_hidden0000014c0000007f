/**
 * ReviewSubmitPanel Component
 * Summary of verification data before submission
 */

import { type VerificationRequest, canSubmitForReview, getBlockingIssues } from '@/lib/verification'
import { Building2, Check, Fingerprint, IdCard, UserRound } from 'lucide-react'
import { Card, StatusChip } from '@/components/ui/kit'

interface Props {
  request: VerificationRequest
  onSubmit: () => Promise<void>
  onBack: () => void
  isReadOnly?: boolean
}

export default function ReviewSubmitPanel({ request, onSubmit, onBack, isReadOnly = false }: Props) {
  const canSubmit = canSubmitForReview(request)
  const blockingIssues = getBlockingIssues(request)
  const isSubmitted = ['pending', 'pending_review', 'in_review', 'approved'].includes(request.status)

  const hasAnyDetails =
    Object.values(request.steps || {}).some((step) => step?.status === 'complete') ||
    Boolean(request.reviewNotes) ||
    Boolean(request.submittedAt) ||
    Boolean(request.reviewedAt)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
        {isReadOnly ? 'Verification Details' : 'Review & Submit'}
      </h2>
      <p className="text-sm md:text-base text-gray-600 mb-6">
        {isReadOnly
          ? 'Review your submitted verification information'
          : 'Please review all information before submitting for verification'}
      </p>

      {/* Summary Sections */}
      <div className="space-y-6">
        {!hasAnyDetails && isReadOnly ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm font-semibold text-gray-900">No verification details available</div>
            <div className="text-sm text-gray-600 mt-1">
              This account is marked as verified, but no submitted verification fields/files were found.
              This can happen if verification was granted manually by an admin or if the record predates the current verification flow.
            </div>
          </div>
        ) : null}

        {/* Organizer Info */}
        {request.steps.organizerInfo.status === 'complete' && (
          <SummarySection
            title="Organizer Information"
            icon={<UserRound className="w-5 h-5 text-gray-700" />}
            fields={request.steps.organizerInfo.fields}
          />
        )}

        {/* Government ID */}
        {request.steps.governmentId.status === 'complete' && (
          <SummarySection
            title="Government ID"
            icon={<IdCard className="w-5 h-5 text-gray-700" />}
            fields={{
              ...request.steps.governmentId.fields,
              'ID Front': request.files.governmentId?.front ? '✓ Uploaded' : 'Not uploaded',
              'ID Back': request.files.governmentId?.back ? '✓ Uploaded' : 'Not uploaded'
            }}
          />
        )}

        {/* Selfie */}
        {request.steps.selfie.status === 'complete' && (
          <SummarySection
            title="Identity Verification"
            icon={<Fingerprint className="w-5 h-5 text-gray-700" />}
            fields={{
              ...request.steps.selfie.fields,
              'Selfie Photo': request.files.selfie?.path ? '✓ Uploaded' : 'Not uploaded'
            }}
          />
        )}

        {/* Business Details */}
        {request.steps.businessDetails.status === 'complete' && (
          <SummarySection
            title="Business Details"
            icon={<Building2 className="w-5 h-5 text-gray-700" />}
            fields={request.steps.businessDetails.fields}
          />
        )}
      </div>

      {/* Blocking Issues */}
      {!canSubmit && !isReadOnly && blockingIssues.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-semibold text-amber-900 mb-2 text-sm md:text-base">
            Complete required steps to submit:
          </h3>
          <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
            {blockingIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Submission Status */}
      {isSubmitted && (
        <div className="mt-6 p-4 bg-brand-50 border border-brand-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="bg-brand-100 rounded-full p-2 flex-shrink-0">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-brand-900 mb-1 text-sm md:text-base">
                Verification Submitted
              </h3>
              <p className="text-sm text-brand-800">
                Submitted on {request.submittedAt ? new Date(request.submittedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </p>
              {request.reviewedAt && (
                <p className="text-sm text-brand-800 mt-1">
                  Reviewed on {new Date(request.reviewedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isReadOnly && (
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            ← Back to Steps
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all shadow-md ${
              canSubmit
                ? 'bg-brand-700 hover:bg-brand-800 text-white hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canSubmit ? 'Submit for Review' : 'Complete Required Steps'}
          </button>
        </div>
      )}

      {/* Terms & Conditions */}
      {!isReadOnly && canSubmit && (
        <div className="mt-4 text-xs md:text-sm text-gray-600 text-center">
          By submitting, you agree to our{' '}
          <a href="/terms" className="text-brand-700 hover:text-brand-800 underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-brand-700 hover:text-brand-800 underline">
            Privacy Policy
          </a>
        </div>
      )}
    </div>
  )
}

interface SummarySectionProps {
  title: string
  icon: React.ReactNode
  fields: Record<string, any>
}

function SummarySection({ title, icon, fields }: SummarySectionProps) {
  const entries = Object.entries(fields).filter(([_, value]) => value !== undefined && value !== null && value !== '')

  if (entries.length === 0) return null

  return (
    <Card className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          <h3 className="font-semibold text-gray-900 text-base md:text-lg">
            {title}
          </h3>
        </div>
        <StatusChip tone="success" icon={Check}>Complete</StatusChip>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs md:text-sm text-gray-600 mb-1">
              {formatFieldName(key)}
            </dt>
            <dd className="text-sm md:text-base text-gray-900 font-medium">
              {formatFieldValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

// Helper: Format field names
function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    full_name: 'Full Name',
    phone: 'Phone Number',
    organization_name: 'Organization Name',
    organization_type: 'Organization Type',
    email: 'Email Address',
    address: 'Address',
    city: 'City',
    country: 'Country',
    business_registration: 'Business Registration',
    tax_id: 'Tax ID Number',
    payout_method: 'Payout Method',
    bank_name: 'Bank Name',
    bank_account: 'Account Number',
    moncash_number: 'MonCash Number',
    'ID Front': 'ID Front',
    'ID Back': 'ID Back',
    'Selfie Photo': 'Selfie Photo'
  }

  return fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Helper: Format field values
function formatFieldValue(value: any): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (value instanceof Date) {
    return value.toLocaleDateString()
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
