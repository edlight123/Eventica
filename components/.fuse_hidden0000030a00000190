'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface EventPhoto {
  id: string
  photo_url: string
  caption: string | null
  created_at: string
  uploaded_by: string
  users: {
    name: string
  }
}

interface EventPhotoGalleryProps {
  eventId: string
  userId: string | null
  isOrganizer: boolean
}

export default function EventPhotoGallery({ eventId, userId, isOrganizer }: EventPhotoGalleryProps) {
  const router = useRouter()
  const [photos, setPhotos] = useState<EventPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null)

  const fetchPhotos = useCallback(async () => {
    try {
      const response = await fetch(`/api/event-photos?eventId=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch photos')
      const data = await response.json()
      setPhotos(data.photos || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      const response = await fetch(`/api/event-photos?photoId=${photoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete photo')

      alert('Photo deleted successfully!')
      setSelectedPhoto(null)
      fetchPhotos()
      router.refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to delete photo')
    }
  }

  if (loading) {
    return <p className="text-gray-600">Loading photos...</p>
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
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
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No photos yet</p>
        <p className="text-xs text-gray-400">Be the first to share a photo from this event!</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-gray-100"
          >
            <Image
              src={photo.photo_url}
              alt={photo.caption || 'Event photo'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.caption && (
                  <p className="text-sm font-medium line-clamp-2">{photo.caption}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              ✕
            </button>

            <div className="flex flex-col md:flex-row">
              <div className="relative flex-1 bg-black">
                <div className="relative aspect-[4/3] md:aspect-auto md:h-[80vh]">
                  <Image
                    src={selectedPhoto.photo_url}
                    alt={selectedPhoto.caption || 'Event photo'}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="w-full md:w-96 p-6 bg-white overflow-y-auto max-h-[40vh] md:max-h-[80vh]">
                <div className="space-y-4">
                  {selectedPhoto.caption && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Caption</h3>
                      <p className="text-gray-700">{selectedPhoto.caption}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Uploaded by</h3>
                    <p className="text-gray-700">{selectedPhoto.users.name}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Date</h3>
                    <p className="text-gray-700">
                      {new Date(selectedPhoto.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {(isOrganizer || selectedPhoto.uploaded_by === userId) && (
                    <button
                      onClick={() => handleDelete(selectedPhoto.id)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete Photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
