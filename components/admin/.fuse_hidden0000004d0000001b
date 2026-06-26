'use client'

import { useState } from 'react'
import { Upload, X, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react'
import Image from 'next/image'

interface PayoutReceiptUploadProps {
  payoutId: string
  organizerId: string
  currentReceiptUrl?: string
  onUploadComplete?: (receiptUrl: string) => void
}

export default function PayoutReceiptUpload({
  payoutId,
  organizerId,
  currentReceiptUrl,
  onUploadComplete
}: PayoutReceiptUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentReceiptUrl || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image (JPG, PNG, WebP) or PDF file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setError(null)
    setSuccess(false)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      // Get auth token
      const { auth } = await import('@/lib/firebase/client')
      const token = await auth.currentUser?.getIdToken()

      if (!token) {
        throw new Error('Authentication required')
      }

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('payoutId', payoutId)
      formData.append('organizerId', organizerId)

      const response = await fetch('/api/admin/upload-receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const { receiptUrl } = await response.json()
      
      setSuccess(true)
      setPreviewUrl(receiptUrl)
      onUploadComplete?.(receiptUrl)

      // Clear selected file after successful upload
      setTimeout(() => {
        setSelectedFile(null)
        setSuccess(false)
      }, 3000)

    } catch (err: any) {
      console.error('Receipt upload error:', err)
      setError(err.message || 'Failed to upload receipt')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(currentReceiptUrl || null)
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="space-y-4">
      {/* Current Receipt Display */}
      {currentReceiptUrl && !selectedFile && (
        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Receipt Uploaded</span>
            </div>
            <a
              href={currentReceiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800"
            >
              <Download className="w-4 h-4" />
              View Receipt
            </a>
          </div>
          
          {currentReceiptUrl.includes('.pdf') ? (
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <FileText className="w-8 h-8 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Receipt Document</p>
                <p className="text-xs text-gray-500">PDF File</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-48 bg-white rounded border">
              <Image
                src={currentReceiptUrl}
                alt="Payment receipt"
                fill
                className="object-contain rounded"
              />
            </div>
          )}
        </div>
      )}

      {/* Upload Form */}
      <div className="border rounded-lg p-4">
        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">
            {currentReceiptUrl ? 'Replace Receipt' : 'Upload Payment Receipt'}
            <span className="text-red-500 ml-1">*</span>
          </span>
          <span className="block text-xs text-gray-500 mt-1">
            Upload proof of payment (JPG, PNG, PDF - Max 5MB)
          </span>
        </label>

        {/* File Input */}
        <div className="relative">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="receipt-upload"
            disabled={uploading}
          />
          <label
            htmlFor="receipt-upload"
            className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
              uploading
                ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                : 'hover:bg-gray-50 border-gray-300 hover:border-brand-400'
            }`}
          >
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {selectedFile ? 'Change file' : 'Click to browse or drag file here'}
            </span>
          </label>
        </div>

        {/* Selected File Preview */}
        {selectedFile && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-200 rounded-lg">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectedFile.type.startsWith('image/') ? (
                  previewUrl && (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  )
                ) : (
                  <FileText className="w-12 h-12 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="ml-2 p-1 hover:bg-brand-100 rounded transition-colors"
                disabled={uploading}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-brand-700 text-white px-4 py-2 rounded-lg hover:bg-brand-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Receipt</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Receipt uploaded successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
