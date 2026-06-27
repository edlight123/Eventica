/**
 * GovernmentIDForm Component
 * Upload form for government ID (front and back)
 */

'use client'

import { useState } from 'react'
import DocumentUploadCard from '../DocumentUploadCard'
import { uploadVerificationDocument, updateVerificationFiles } from '@/lib/verification'

interface Props {
  userId: string
  initialData: {
    frontPath?: string
    backPath?: string
  }
  onSave: () => Promise<void>
  onCancel: () => void
}

export default function GovernmentIDForm({ userId, initialData, onSave, onCancel }: Props) {
  const [frontPath, setFrontPath] = useState(initialData.frontPath)
  const [backPath, setBackPath] = useState(initialData.backPath)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleFrontUpload = async (file: File) => {
    try {
      const path = await uploadVerificationDocument(userId, file, 'id_front')
      setFrontPath(path)
      
      // Update Firestore immediately - only include defined values
      const updateData: any = {
        governmentId: {
          front: path,
          uploadedAt: new Date()
        }
      }
      if (backPath) {
        updateData.governmentId.back = backPath
      }
      await updateVerificationFiles(userId, updateData)
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload ID front')
    }
  }

  const handleBackUpload = async (file: File) => {
    try {
      const path = await uploadVerificationDocument(userId, file, 'id_back')
      setBackPath(path)
      
      // Update Firestore immediately - only include defined values
      const updateData: any = {
        governmentId: {
          back: path,
          uploadedAt: new Date()
        }
      }
      if (frontPath) {
        updateData.governmentId.front = frontPath
      }
      await updateVerificationFiles(userId, updateData)
    } catch (err: any) {
      throw new Error(err.message || 'Failed to upload ID back')
    }
  }

  const handleFrontRemove = async () => {
    setFrontPath(undefined)
    // Don't update Firestore with undefined - let it keep existing data
    if (backPath) {
      await updateVerificationFiles(userId, {
        governmentId: {
          back: backPath
        }
      })
    }
  }

  const handleBackRemove = async () => {
    setBackPath(undefined)
    // Don't update Firestore with undefined - let it keep existing data
    if (frontPath) {
      await updateVerificationFiles(userId, {
        governmentId: {
          front: frontPath
        }
      })
    }
  }

  const handleContinue = async () => {
    if (!frontPath || !backPath) {
      setError('Please upload both front and back of your ID')
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
      <div className="bg-[#141414] border border-white/10 rounded-lg p-6 md:p-8">
        <h3 className="text-lg md:text-xl font-bold text-white mb-2">
          Government ID Upload
        </h3>
        <p className="text-sm md:text-base text-white/60 mb-6">
          Upload clear photos of both sides of your government-issued ID
        </p>

        {/* Tips */}
        <div className="border border-brand-500/30 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-brand-300 text-sm mb-2">📸 Photo Tips:</h4>
          <ul className="text-sm text-brand-300 space-y-1 list-disc list-inside">
            <li>Ensure all text is clearly readable</li>
            <li>Use good lighting (avoid glare)</li>
            <li>Place ID on a contrasting background</li>
            <li>Photo should not be blurry or cropped</li>
          </ul>
        </div>

        {/* Upload Cards */}
        <div className="space-y-4">
          <DocumentUploadCard
            title="ID Front"
            description="Upload the front side of your national ID"
            existingFileUrl={frontPath}
            onUpload={handleFrontUpload}
            onRemove={handleFrontRemove}
            required
          />

          <DocumentUploadCard
            title="ID Back"
            description="Upload the back side of your national ID"
            existingFileUrl={backPath}
            onUpload={handleBackUpload}
            onRemove={handleBackRemove}
            required
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-6 py-3 text-white/70 bg-[#141414] border-2 border-white/15 rounded-lg font-semibold hover:bg-[#0a0a0a] transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSaving || !frontPath || !backPath}
          className="flex-1 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  )
}
