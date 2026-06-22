/**
 * Organizer Verification Page
 * Premium step-by-step verification flow
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import VerificationStatusHero from '@/components/organizer/verification/VerificationStatusHero'
import VerificationStepper from '@/components/organizer/verification/VerificationStepper'
import ReviewSubmitPanel from '@/components/organizer/verification/ReviewSubmitPanel'
import VerificationWelcome from '@/components/organizer/verification/VerificationWelcome'
import VerificationWizard from '@/components/organizer/verification/VerificationWizard'
import OrganizerInfoForm from '@/components/organizer/verification/forms/OrganizerInfoForm'
import GovernmentIDForm from '@/components/organizer/verification/forms/GovernmentIDForm'
import SelfieForm from '@/components/organizer/verification/forms/SelfieForm'
import BusinessDetailsForm from '@/components/organizer/verification/forms/BusinessDetailsForm'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import {
  getVerificationRequest,
  initializeVerificationRequest,
  updateVerificationStep,
  submitVerificationForReview,
  restartVerification,
  calculateCompletionPercentage,
  canSubmitForReview,
  type VerificationRequest
} from '@/lib/verification'
import { useOrganizerClientGuard } from '@/lib/hooks/useOrganizerClientGuard'

type ViewMode = 'welcome' | 'wizard' | 'overview' | 'organizerInfo' | 'governmentId' | 'selfie' | 'businessDetails' | 'review'

export default function VerifyOrganizerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { firebaseUser, navbarUser: user, userProfile, loading: authLoading } = useOrganizerClientGuard({
    loginRedirectPath: '/organizer/verify',
    upgradeRedirectPath: '/organizer/verify',
  })

  const [loading, setLoading] = useState(true)
  const [restarting, setRestarting] = useState(false)
  const [request, setRequest] = useState<VerificationRequest | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('welcome')
  const [error, setError] = useState('')
  const [userVerification, setUserVerification] = useState<{ is_verified?: boolean; verification_status?: string } | null>(null)

  const wantsDetails = searchParams.get('details') === '1'

  const userIsVerified = Boolean(userVerification?.is_verified) || userVerification?.verification_status === 'approved'
  const effectiveStatus = request ? (userIsVerified ? 'approved' : request.status) : null

  // If already approved, default to the organizer dashboard unless the user explicitly requests details.
  useEffect(() => {
    if (!request) return
    if (effectiveStatus !== 'approved') return
    if (wantsDetails) return

    const timeoutId = window.setTimeout(() => {
      router.replace('/organizer')
    }, 1200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [request, effectiveStatus, wantsDetails, router])

  // If details are requested for an in-flight review state, jump straight to the submitted view.
  // For approved, keep the step overview visible so the user can browse sections.
  useEffect(() => {
    if (!request) return
    if (!wantsDetails) return
    if (!['pending', 'pending_review', 'in_review'].includes(request.status)) return
    setViewMode('review')
  }, [request, wantsDetails])

  // Load verification request once authenticated.
  useEffect(() => {
    if (authLoading) return
    if (!firebaseUser) return

    const uid = firebaseUser.uid
    setUserVerification({
      is_verified: userProfile?.is_verified ?? false,
      verification_status: userProfile?.verification_status ?? undefined,
    })

    let cancelled = false

    const load = async () => {
      try {
        let verificationRequest = await getVerificationRequest(uid)

        // Initialize if doesn't exist
        if (!verificationRequest) {
          verificationRequest = await initializeVerificationRequest(uid)
        } else {
          // Migrate old payout step to optional (persisted so submit validation won't be blocked).
          if (verificationRequest.steps.payoutSetup?.required === true) {
            await updateVerificationStep(uid, 'payoutSetup', {
              required: false,
              missingFields: [],
              description: 'Configure how you receive payments (can be set up later)'
            })
            verificationRequest = (await getVerificationRequest(uid)) || verificationRequest
          }
        }

        if (!cancelled) {
          setRequest(verificationRequest)
          
          // Determine initial view mode based on progress
          const completionPct = calculateCompletionPercentage(verificationRequest)
          const isReadOnly = ['pending', 'pending_review', 'in_review', 'approved', 'rejected'].includes(verificationRequest.status)
          
          if (isReadOnly) {
            // Show overview for submitted/approved/rejected
            setViewMode('overview')
          } else if (verificationRequest.status === 'not_started' && completionPct === 0) {
            // Fresh user - show welcome screen
            setViewMode('welcome')
          } else if (completionPct < 100) {
            // In progress - show wizard
            setViewMode('wizard')
          } else {
            // Complete but not submitted - show overview
            setViewMode('overview')
          }
        }
      } catch (err: any) {
        console.error('Error loading verification:', err)
        if (!cancelled) setError(err.message || 'Failed to load verification data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [authLoading, firebaseUser, userProfile])

  // Reload verification data
  const reloadRequest = async () => {
    if (!user) return
    
    try {
      const freshRequest = await getVerificationRequest(user.id)
      if (freshRequest) {
        setRequest(freshRequest)
      }
    } catch (err: any) {
      console.error('Error reloading verification:', err)
    }
  }

  const dismissError = () => setError('')

  // Handle step completion
  const handleSaveOrganizerInfo = async (data: Record<string, any>) => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'organizerInfo', {
      status: 'complete',
      fields: data,
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSaveGovernmentID = async () => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'governmentId', {
      status: 'complete',
      fields: {},
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSaveSelfie = async () => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'selfie', {
      status: 'complete',
      fields: {},
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSaveBusinessDetails = async (data: Record<string, any>) => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'businessDetails', {
      status: 'complete',
      fields: data,
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSkipBusinessDetails = async () => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'businessDetails', {
      status: 'complete',
      fields: {},
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  // Handle wizard step completion
  const handleWizardStepComplete = async (stepId: string, data?: Record<string, any>) => {
    if (!user || !request) return

    await updateVerificationStep(user.id, stepId as keyof VerificationRequest['steps'], {
      status: 'complete',
      fields: data || {},
      missingFields: []
    })

    await reloadRequest()
  }

  const handleSubmit = async () => {
    if (!user || !request) return

    try {
      setError('')
      await submitVerificationForReview(user.id)
      await reloadRequest()
      setViewMode('overview')
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification')
    }
  }

  const handleRestart = async () => {
    if (!user || !request) return

    try {
      setRestarting(true)
      setError('')
      await restartVerification(user.id)
      await reloadRequest()
      setViewMode('overview')
    } catch (err: any) {
      setError(err.message || 'Failed to restart verification')
    } finally {
      setRestarting(false)
    }
  }

  const handleEditStep = (stepId: keyof VerificationRequest['steps']) => {
    // During read-only states, keep the flow read-only and show the submitted details instead.
    const statusToUse = request ? (userIsVerified ? 'approved' : request.status) : null
    if (statusToUse && ['pending', 'pending_review', 'in_review', 'approved', 'rejected'].includes(statusToUse)) {
      setViewMode('review')
      return
    }

    const viewModes: Record<string, ViewMode> = {
      organizerInfo: 'organizerInfo',
      governmentId: 'governmentId',
      selfie: 'selfie',
      businessDetails: 'businessDetails',
    }

    setViewMode(viewModes[stepId] || 'overview')
  }

  if (authLoading || loading || restarting) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {restarting ? 'Resetting verification...' : 'Loading verification...'}
          </p>
        </div>
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-bold text-red-900 mb-2">Error Loading Verification</h2>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!request || !user) {
    return null
  }

  const statusForUI = effectiveStatus || request.status
  const requestForUI: VerificationRequest = statusForUI === request.status ? request : ({ ...request, status: statusForUI } as VerificationRequest)
  const completionPercentage = statusForUI === 'approved' ? 100 : calculateCompletionPercentage(requestForUI)
  const isReadOnly = ['pending', 'in_review', 'approved', 'rejected'].includes(statusForUI)
  const canSubmit = canSubmitForReview(requestForUI)

  // Welcome screen for new users
  if (viewMode === 'welcome') {
    return (
      <VerificationWelcome 
        onStart={() => setViewMode('wizard')} 
      />
    )
  }

  // Wizard view for users in progress
  if (viewMode === 'wizard') {
    return (
      <VerificationWizard
        request={requestForUI}
        userId={user.id}
        onStepComplete={handleWizardStepComplete}
        onComplete={() => setViewMode('review')}
        onExit={() => setViewMode('overview')}
      />
    )
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/organizer" className="hover:text-gray-900">
              Organizer
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Verification</span>
          </div>
          <EditorialHeader
            title="Verification"
            subtitle="Verify your identity to publish paid events and receive payouts."
          />
        </div>

        {/* Status Hero */}
        <VerificationStatusHero
          status={statusForUI}
          completionPercentage={completionPercentage}
          reviewNotes={request.reviewNotes}
          onRestart={handleRestart}
          isRestarting={restarting}
        />

        {statusForUI === 'approved' && !wantsDetails ? (
          <div className="bg-white border border-green-200 rounded-xl p-4 md:p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">You’re already verified</div>
                <div className="text-sm text-gray-600 mt-1">Redirecting you to your organizer dashboard…</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href="/organizer/verify?details=1"
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-gray-900 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all text-center"
                >
                  View Verification Details
                </Link>
                <Link
                  href="/organizer"
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-gray-900 hover:bg-gray-800 transition-all text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="bg-white border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-red-900">Something went wrong</div>
                <div className="text-sm text-red-700 mt-1">{error}</div>
              </div>
              <button
                onClick={dismissError}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {/* Main Content */}
        {viewMode === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <VerificationStepper
                request={requestForUI}
                onEditStep={handleEditStep}
                isReadOnly={isReadOnly}
              />
            </div>

            <aside className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Submission</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {statusForUI === 'approved'
                        ? 'Your verification is approved. You can view the details anytime.'
                        : isReadOnly
                          ? 'Your verification is submitted. You can view the details anytime.'
                          : canSubmit
                            ? 'Everything required is complete. Review your details and submit for approval.'
                            : 'Complete the required steps to unlock submission.'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Progress</div>
                    <div className="text-sm font-semibold text-gray-900">{completionPercentage}%</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-brand-700 h-2 rounded-full transition-all"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <button
                    onClick={() => setViewMode('review')}
                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-all shadow-sm ${
                      isReadOnly
                        ? 'bg-gray-900 hover:bg-gray-800 text-white'
                        : canSubmit
                          ? 'bg-brand-700 hover:bg-brand-800 text-white'
                          : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!isReadOnly && !canSubmit}
                  >
                    {statusForUI === 'approved'
                      ? 'View Verification Details'
                      : isReadOnly
                        ? 'View Submission Details'
                        : canSubmit
                          ? 'Review & Submit'
                          : 'Complete Required Steps'}
                  </button>

                  {!isReadOnly ? (
                    <p className="text-xs text-gray-600">
                      Submissions are typically reviewed within 24–48 hours.
                    </p>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        )}

        {viewMode === 'organizerInfo' && (
          <OrganizerInfoForm
            initialData={request.steps.organizerInfo.fields}
            onSave={handleSaveOrganizerInfo}
            onCancel={() => setViewMode('overview')}
          />
        )}

        {viewMode === 'governmentId' && (
          <GovernmentIDForm
            userId={user.id}
            initialData={{
              frontPath: request.files.governmentId?.front,
              backPath: request.files.governmentId?.back
            }}
            onSave={handleSaveGovernmentID}
            onCancel={() => setViewMode('overview')}
          />
        )}

        {viewMode === 'selfie' && (
          <SelfieForm
            userId={user.id}
            initialData={{
              selfiePath: request.files.selfie?.path
            }}
            onSave={handleSaveSelfie}
            onCancel={() => setViewMode('overview')}
          />
        )}

        {viewMode === 'businessDetails' && (
          <BusinessDetailsForm
            initialData={request.steps.businessDetails.fields}
            onSave={handleSaveBusinessDetails}
            onCancel={() => setViewMode('overview')}
            onSkip={handleSkipBusinessDetails}
          />
        )}

        {viewMode === 'review' && (
          <ReviewSubmitPanel
            request={requestForUI}
            onSubmit={handleSubmit}
            onBack={() => setViewMode('overview')}
            isReadOnly={isReadOnly}
          />
        )}
      </div>    </div>
  )
}
