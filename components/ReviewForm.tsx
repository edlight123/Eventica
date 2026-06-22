'use client'

import { useState, useEffect } from 'react'

interface ReviewFormProps {
  eventId: string
  ticketId: string
  eventTitle: string
  onSuccess?: () => void
}

export default function ReviewForm({ eventId, ticketId, eventTitle, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [organizerRating, setOrganizerRating] = useState(0)
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketId,
          rating,
          comment: comment.trim() || null,
          organizerRating: organizerRating || null,
          wouldRecommend
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Review: {eventTitle}
      </h3>

      {/* Event Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How was the event? *
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-3xl transition-colors"
            >
              <span className={
                star <= (hoverRating || rating)
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              }>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your review (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="Share your experience..."
          maxLength={500}
        />
        <div className="text-xs text-gray-500 mt-1">{comment.length}/500 characters</div>
      </div>

      {/* Organizer Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How was the organizer? (optional)
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setOrganizerRating(star)}
              className="text-2xl transition-colors"
            >
              <span className={star <= organizerRating ? 'text-teal-500' : 'text-gray-300'}>
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Would you recommend this event?
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`px-6 py-2 rounded-lg border-2 transition-colors ${
              wouldRecommend === true
                ? 'border-teal-600 bg-teal-50 text-teal-700'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            👍 Yes
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`px-6 py-2 rounded-lg border-2 transition-colors ${
              wouldRecommend === false
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            👎 No
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}
