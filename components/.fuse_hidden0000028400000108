'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface EventPhotoUploadProps {
  eventId: string
  userId: string
}

export default function EventPhotoUpload({ eventId, userId }: EventPhotoUploadProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [caption, setCaption] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    const file = files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploading(true)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('eventId', eventId)
      if (caption) formData.append('caption', caption)

      // Upload photo
      const response = await fetch('/api/event-photos/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload photo')
      }

      alert('Photo uploaded successfully!')
      setCaption('')
      router.refresh()
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-teal-600 bg-teal-50'
            : 'border-gray-300 hover:border-teal-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleChange}
          disabled={uploading}
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900">
              {uploading ? 'Uploading...' : 'Drop your photo here or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              JPG, PNG, GIF up to 5MB
            </p>
          </div>

          <button
            type="button"
            onClick={onButtonClick}
            disabled={uploading}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300"
          >
            {uploading ? 'Uploading...' : 'Choose File'}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Caption (optional)
        </label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption for your photo..."
          disabled={uploading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
        />
      </div>
    </div>
  )
}
