'use client'

interface SocialShareProps {
  eventTitle: string
  eventUrl: string
}

export default function SocialShare({ eventTitle, eventUrl }: SocialShareProps) {
  const encodedUrl = encodeURIComponent(eventUrl)
  const encodedTitle = encodeURIComponent(eventTitle)

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
  }

  function copyLink() {
    navigator.clipboard.writeText(eventUrl)
    alert('Link copied!')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Share This Event</h3>
      
      <div className="flex flex-wrap gap-3">
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <span>Share on Facebook</span>
        </a>

        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition"
        >
          <span>Share on Twitter</span>
        </a>

        <a
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
        >
          <span>Share on WhatsApp</span>
        </a>

        <button
          onClick={copyLink}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition"
        >
          <span>Copy Link</span>
        </button>
      </div>
    </div>
  )
}
