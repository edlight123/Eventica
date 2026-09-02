'use client'

import { useState, useRef } from 'react'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'
import Image from 'next/image'

interface ImageUploadProps {
  currentImage?: string | null
  onImageUploaded: (url: string) => void
  bucket?: string
  /** 'flyer' = tall portrait poster; 'square' = square brand logo (Posh-style). */
  variant?: 'default' | 'flyer' | 'square'
  /**
   * Upload through an API route (multipart POST responding { url }) instead
   * of the client Firebase SDK — how signed-out visitors upload on /create
   * (storage rules require auth; the route uses the admin SDK).
   */
  endpoint?: string
}

export default function ImageUpload({
  currentImage,
  onImageUploaded,
  bucket = 'event-images',
  variant = 'default',
  endpoint,
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

      // API-route upload (guest mode): the server does the storage write.
      if (endpoint) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(endpoint, { method: 'POST', body: form })
        const body = await res.json().catch(() => ({}))
        if (!res.ok || !body?.url) {
          throw new Error(body?.error || 'Upload failed. Please try again.')
        }
        onImageUploaded(body.url)
        return
      }

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

  const isFlyer = variant === 'flyer'
  const isSquare = variant === 'square'
  const frame = isFlyer ? 'aspect-[4/5]' : isSquare ? 'aspect-square' : 'h-64'
  const ctaLabel = isFlyer ? 'Upload your flyer' : isSquare ? 'Upload logo' : 'Upload image'

  // Cool, Posh-style dropzone backdrop: a teal glow over a faint perspective grid.
  const coolBg: React.CSSProperties =
    isFlyer || isSquare
      ? {
          backgroundColor: '#0c0e0d',
          backgroundImage: [
            'radial-gradient(125% 90% at 50% -10%, rgba(20,184,166,0.22), rgba(20,184,166,0.04) 45%, transparent 70%)',
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '100% 100%, 28px 28px, 28px 28px',
        }
      : {}

  return (
    <div className="space-y-3">
      <div className="relative">
        {preview ? (
          <div className="group relative">
            <div className={`relative w-full ${frame}`}>
              <Image
                src={preview}
                alt="Preview"
                fill
                sizes="(max-width: 1024px) 100vw, 360px"
                className="rounded-2xl  object-cover"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
              >
                {isFlyer ? 'Change flyer' : isSquare ? 'Change logo' : 'Change image'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={coolBg}
            className={`group/flyer relative flex w-full ${frame} flex-col items-center justify-center overflow-hidden rounded-2xl  text-white/50 transition hover:border-brand-400/40`}
          >
            <span className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg transition-transform group-hover/flyer:scale-105">
              {ctaLabel}
            </span>
            <span className="mt-3 text-xs text-white/45">PNG or JPG · up to 5MB</span>
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
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-brand-400"></div>
          <span className="ml-2 text-sm text-white/60">Uploading…</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
