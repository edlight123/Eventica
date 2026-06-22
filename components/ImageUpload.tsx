'use client'

import { useState, useRef } from 'react'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import Image from 'next/image'

interface ImageUploadProps {
  currentImage?: string | null
  onImageUploaded: (url: string) => void
  bucket?: string
}

export default function ImageUpload({ 
  currentImage, 
  onImageUploaded,
  bucket = 'event-images' 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Firebase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `event-images/${fileName}`

      console.log('Uploading file:', filePath)
      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      console.log('Upload data:', data)
      
      // Use the publicUrl from upload response if available, otherwise fetch it
      let publicUrl = data?.publicUrl
      
      if (!publicUrl) {
        console.log('Getting public URL for:', filePath)
        const urlResult = await supabase.storage
          .from(bucket)
          .getPublicUrl(filePath)
        publicUrl = urlResult.data.publicUrl
      }

      // Never report success without a real URL — otherwise the form thinks the
      // banner is set while banner_image_url is empty, and publish fails later.
      if (!publicUrl) {
        throw new Error('Upload did not return a public URL')
      }

      console.log('Final public URL:', publicUrl)
      onImageUploaded(publicUrl)
    } catch (err: any) {
      console.error('Upload error:', err)
      const code: string = err?.code || ''
      const rawMessage: string = err?.message || ''
      let message = 'Failed to upload image. Please try again.'
      if (code === 'storage/quota-exceeded' || /quota/i.test(rawMessage)) {
        message = 'Image storage is temporarily unavailable. Your event was not saved with this image — please try again shortly or contact support.'
      } else if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
        message = "You don't have permission to upload right now. Please sign in again and retry."
      } else if (code === 'storage/retry-limit-exceeded') {
        message = 'The upload timed out. Check your connection and try again.'
      } else if (rawMessage) {
        message = rawMessage
      }
      setError(message)
      setPreview(currentImage || null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {preview ? (
          <div className="relative group">
            <div className="relative w-full h-64">
              <Image
                src={preview}
                alt="Preview"
                fill
                sizes="100vw"
                className="object-cover rounded-xl border-2 border-gray-200"
              />
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                Change Image
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-64 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 transition flex flex-col items-center justify-center text-gray-600 hover:text-orange-600"
          >
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">Click to upload event banner</span>
            <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          <span className="ml-2 text-sm text-gray-600">Uploading...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Recommended size: 1200x630px for best display across devices
      </p>
    </div>
  )
}
