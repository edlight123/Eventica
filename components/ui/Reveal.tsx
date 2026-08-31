'use client'

// Scroll-time reveal for the organizer landing: children rise into place the
// first time they enter the viewport (IntersectionObserver → .is-seen, styles
// in globals.css under `plt-reveal`). Reduced motion shows content immediately.

import { useEffect, useRef, useState } from 'react'

export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  /** Stagger, in ms. */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      // Eager: fire as soon as any pixel enters, so a fast scroll never
      // lands on a black viewport waiting for the transition.
      { threshold: 0.01, rootMargin: '0px 0px -16px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`plt-reveal ${seen ? 'is-seen' : ''} ${className}`}
      style={delay ? ({ ['--d' as any]: `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}
