'use client'

import { useState } from 'react'

interface AddToWalletButtonProps {
  ticketId: string
  qrCodeData: string
  eventTitle: string
  eventDate: string
  venueName: string
  ticketNumber: number
  totalTickets: number
}

export default function AddToWalletButton({
  ticketId,
  qrCodeData,
  eventTitle,
  eventDate,
  venueName,
  ticketNumber,
  totalTickets,
}: AddToWalletButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleAddToWallet = async () => {
    setIsGenerating(true)
    
    try {
      // Call API to generate Apple Wallet pass or Google Pay pass
      const response = await fetch('/api/wallet/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          qrCodeData,
          eventTitle,
          eventDate,
          venueName,
          ticketNumber,
          totalTickets,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate wallet pass')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ticket-${ticketNumber}-${eventTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pkpass`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error adding to wallet:', error)
      alert('Failed to add to wallet. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadQR = () => {
    // Create a canvas to generate QR code image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // For now, just trigger download of the page
    // In a full implementation, you'd generate the QR code image here
    window.print()
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={handleAddToWallet}
        disabled={isGenerating}
        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
            </svg>
            Add to Wallet
          </>
        )}
      </button>

      <button
        onClick={handleDownloadQR}
        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Save Image
      </button>
    </div>
  )
}
