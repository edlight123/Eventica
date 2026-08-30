'use client'

// The custom cursor: a small dot that IS the pointer, and a lagging ring that
// gives the site its weight. Interactive elements grow the ring; elements
// tagged data-cursor (posters → "view", worlds → "explore") turn it into a
// labeled pill. Deliberately few states — small, intentional moments.
//
// Public surfaces only (same gate as SmoothScroll), fine pointers only
// (touch never sees it), reduced motion never mounts it, and text fields keep
// the native caret cursor via CSS.

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const NATIVE_CURSOR_PREFIXES = [
  '/admin',
  '/organizer',
  '/checkout',
  '/auth',
  '/scan',
  '/staff',
  '/settings',
  '/profile',
]

export default function Cursor() {
  const pathname = usePathname() || '/'
  const routeEnabled = !NATIVE_CURSOR_PREFIXES.some((p) => pathname.startsWith(p))
  const [active, setActive] = useState(false)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!routeEnabled) {
      setActive(false)
      return
    }
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setActive(true)

    const pos = { x: -100, y: -100 }
    const ring = { x: -100, y: -100 }
    let hoverKind: '' | 'link' | 'label' = ''
    let rafId = 0

    const onMove = (e: MouseEvent) => {
      pos.x = e.clientX
      pos.y = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`
      }
    }

    // Event delegation: one listener decides the cursor's mood.
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      const labeled = t?.closest?.('[data-cursor]') as HTMLElement | null
      const link = labeled || (t?.closest?.('a, button, [role="button"], label, select') as HTMLElement | null)
      if (labeled) {
        hoverKind = 'label'
        if (labelRef.current) labelRef.current.textContent = labeled.getAttribute('data-cursor') || 'view'
      } else if (link) {
        hoverKind = 'link'
      } else {
        hoverKind = ''
      }
      ringRef.current?.setAttribute('data-kind', hoverKind)
    }

    const loop = () => {
      // The ring trails the dot — the lag is the luxury.
      ring.x += (pos.x - ring.x) * 0.16
      ring.y += (pos.y - ring.y) * 0.16
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    document.documentElement.classList.add('tk-cursor-on')
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      document.documentElement.classList.remove('tk-cursor-on')
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      setActive(false)
    }
  }, [routeEnabled])

  if (!active) return null

  return (
    <>
      {/* ring first, dot after — the CSS sibling rule hides the dot while the
          ring is a labeled pill, so the blend-mode dot never garbles the text */}
      <div ref={ringRef} aria-hidden className="tk-cursor-ring" data-kind="">
        <span ref={labelRef} className="tk-cursor-label" />
      </div>
      <div ref={dotRef} aria-hidden className="tk-cursor-dot" />
    </>
  )
}
