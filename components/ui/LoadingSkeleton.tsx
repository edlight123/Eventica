'use client'

interface LoadingSkeletonProps {
  rows?: number
  className?: string
  animated?: boolean // controls shimmer on rows; defaults to true
  /** Visual tone. 'light' (default) for dashboards; 'dark' for public dark surfaces. */
  tone?: 'light' | 'dark'
}

export default function LoadingSkeleton({ rows = 6, className = '', animated = true, tone = 'light' }: LoadingSkeletonProps) {
  const bar = tone === 'dark' ? '' : 'bg-gray-200'
  return (
    <div className={`${animated ? 'animate-pulse' : ''} ${className}`}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 mb-3">
          <div className={`h-16 w-16 rounded-lg ${bar}`} />
          <div className="flex-1">
            <div className={`h-4 rounded w-3/5 mb-2 ${bar}`} />
            <div className={`h-3 rounded w-2/5 ${bar}`} />
          </div>
        </div>
      ))}
    </div>
  )
}