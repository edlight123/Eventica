/**
 * SelfieForm Component
 * Upload form for selfie verification
 */

'use client'

import { useState } from 'react'
import DocumentUploadCard from '../DocumentUploadCard'
import { uploadVerificationDocument, updateVerificationFiles } from '@/lib/verification'

interface Props {
  userId: string
  initialData: {
    selfiePath?: string
  }
  onSave: () => Promise<void>
  onCancel: () => void
}

export default function SelfieForm({ userId, initialData, onSave, onCancel }: Props) {
  const [selfiePath, setSelfiePath] = useState(initialData.selfiePath)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (file: File) => {
    try {
      const path = await uploadVerificationDocument(userId, file, 'selfie')
      setSelfiePath(path)
      
      // Update Firestore immediately
      await updateVerificationFiles(userId, {
        selfie: {
          path,
          uploadedAt: new Date()
        }
      })
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload selfie')
    }
  }

  const handleRemove = async () => {
    setSelfiePath(undefined)
    // Avoid writing `undefined` into Firestore (can throw). Clearing locally is enough;
    // the user can re-upload before submission.
    await updateVerificationFiles(userId, {
      selfie: {
        uploadedAt: new Date()
      }
    })
  }

  const handleContinue = async () => {
    if (!selfiePath) {
      setError('Please upload a selfie for identity verification')
      return
    }

    try {
      setIsSaving(true)
      await onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
          Identity Verification
        </h3>
        <p className="text-sm md:text-base text-gray-600 mb-6">
          Take a clear selfie holding your ID next to your face
        </p>

        {/* Instructions */}
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-brand-900 text-sm mb-2">Instructions:</h4>
          <ul className="text-sm text-brand-800 space-y-1 list-disc list-inside">
            <li>Hold your ID next to your face</li>
            <li>Make sure your face is clearly visible</li>
            <li>Ensure the ID text is readable in the photo</li>
            <li>Use good lighting and remove sunglasses/hat</li>
            <li>Look directly at the camera</li>
          </ul>
        </div>

        {/* Upload Card */}
        <DocumentUploadCard
          title="Selfie with ID"
          description="Take or upload a photo of yourself holding your ID"
          existingFileUrl={selfiePath}
          onUpload={handleUpload}
          onRemove={handleRemove}
          required
        />

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSaving || !selfiePath}
          className="flex-1 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  )
}
