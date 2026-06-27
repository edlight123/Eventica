'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface FavoriteButtonProps {
  eventId: string
  userId: string | null
  initialIsFavorite?: boolean
}

export default function FavoriteButton({ eventId, userId, initialIsFavorite = false }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()

  async function toggleFavorite() {
    if (!userId) {
      const redirectTo = `${window.location.pathname}${window.location.search || ''}`
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      })

      if (!response.ok) throw new Error('Failed to toggle favorite')

      const data = await response.json()
      setIsFavorite(data.isFavorite)
      
      showToast({
        type: 'success',
        title: data.isFavorite ? 'Added to favorites!' : 'Removed from favorites',
        message: data.isFavorite ? 'You can find this event in your favorites' : 'Event removed from your favorites',
        duration: 3000
      })
      
      router.refresh()
    } catch (error) {
      console.error('Error toggling favorite:', error)
      showToast({
        type: 'error',
        title: 'Failed to update favorites',
        message: 'Please try again later',
        duration: 4000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`p-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg ${
        isFavorite
          ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-600 hover:from-red-100 hover:to-red-200 ring-2 ring-red-200'
          : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'
      } disabled:opacity-50 transform hover:scale-110`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        className="w-6 h-6 transition-transform duration-300"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
}
