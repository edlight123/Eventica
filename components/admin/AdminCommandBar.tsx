'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Bell, Calendar, Loader2, MapPin, DollarSign, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AdminCommandBarProps {
  // Props removed - will fetch client-side
}

interface SearchResult {
  id: string
  type: 'event' | 'user' | 'order'
  title: string
  subtitle?: string
  href: string
  metadata?: {
    status?: string
    price?: number
    currency?: string
    city?: string
  }
}

export function AdminCommandBar({}: AdminCommandBarProps) {
  const { t } = useTranslation('admin')
  const router = useRouter()
  const [pendingVerifications, setPendingVerifications] = useState(0)
  const [pendingBankVerifications, setPendingBankVerifications] = useState(0)

  // Fetch badge counts client-side
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/admin/platform-counts')
        if (res.ok) {
          const data = await res.json()
          setPendingVerifications(data.pendingVerifications || 0)
          setPendingBankVerifications(data.pendingBankVerifications || 0)
        }
      } catch (err) {
        console.error('Failed to fetch platform counts:', err)
      }
    }

    fetchCounts()
    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      setShowResults(true)
      
      try {
        const response = await fetch('/api/admin/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery.trim() })
        })

        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.results || [])
        } else {
          setSearchResults([])
        }
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleResultClick = (href: string) => {
    setSearchQuery('')
    setShowResults(false)
    router.push(href)
  }

  return (
    <div className="bg-[#0a0a0a] border-b border-white/10 sticky top-14 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 max-w-2xl relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                placeholder={t('nav.search_placeholder')}
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/45 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 animate-spin" />
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showResults && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                {isSearching ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 text-brand-300 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-white/50">Searching...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center">
                    <Search className="w-8 h-8 text-white/50 mx-auto mb-2" />
                    <p className="text-sm text-white/50">No results found</p>
                    <p className="text-xs text-white/50 mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result.href)}
                        className="w-full px-4 py-3 hover:bg-white/[0.04] transition-colors flex items-start gap-3 text-left"
                      >
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          result.type === 'event' ? '' :
                          result.type === 'user' ? '' :
                          ''
                        }`}>
                          {result.type === 'event' ? (
                            <Calendar className="w-4 h-4 text-brand-300" />
                          ) : result.type === 'user' ? (
                            <User className="w-4 h-4 text-brand-300" />
                          ) : (
                            <DollarSign className="w-4 h-4 text-emerald-300" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-white truncate">{result.title}</p>
                            {result.metadata?.status && (
                              <span className={`label-mono uppercase px-2 py-0.5 text-xs font-medium rounded ${
                                result.metadata.status === 'published' || result.metadata.status === 'confirmed' ? 'text-emerald-300' :
                                result.metadata.status === 'draft' || result.metadata.status === 'pending' ? 'text-amber-300' :
                                'bg-[#0a0a0a] text-white/90'
                              }`}>
                                {result.metadata.status}
                              </span>
                            )}
                          </div>
                          {result.subtitle && (
                            <p className="text-sm text-white/50 truncate">{result.subtitle}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="label-mono uppercase text-xs text-white/50">{result.type}</span>
                            {result.metadata?.city && (
                              <span className="flex items-center gap-1 text-xs text-white/50">
                                <MapPin className="w-3 h-3" />
                                {result.metadata.city}
                              </span>
                            )}
                            {result.metadata?.price !== undefined && (
                              <span className="font-mono tabular-nums text-xs text-white/50">
                                {result.metadata.price === 0 ? 'Free' : `${result.metadata.price} ${result.metadata.currency || 'HTG'}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick-nav links removed — they duplicated the left sidebar.
              The top bar is now just global search + the alerts status badge. */}

          {/* Alerts Badge */}
          {pendingVerifications > 0 && (
            <Link
              href="/admin/verify"
              className="relative flex items-center gap-2 px-3 py-2 text-amber-300 rounded-lg hover:bg-amber-500/15 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingVerifications > 9 ? '9+' : pendingVerifications}
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
