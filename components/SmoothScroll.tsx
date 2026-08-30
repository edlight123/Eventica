'use client'

// Lenis smooth scrolling — the posh scroll feel (their html carries
// `lenis lenis-smooth`; same library). Inertial, eased wheel scrolling that
// makes the poster-glow rooms and the pinned chapters read as one continuous
// scene instead of stepped jumps.
//
// Public surfaces only: the working consoles (organizer, admin, checkout,
// scanning) keep the OS-native scroll people expect from tools. Touch
// scrolling stays native everywhere (Lenis default); reduced-motion visitors
// never get the library at all.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'

/** Route prefixes that keep native scroll: tools, flows, and auth. */
const NATIVE_SCROLL_PREFIXES = [
  '/admin',
  '/organizer',
  '/checkout',
  '/auth',
  '/scan',
  '/staff',
  '/settings',
  '/profile',
]

export default function SmoothScroll() {
  const pathname = usePathname() || '/'
  const enabled = !NATIVE_SCROLL_PREFIXES.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      // The posh calibration: weighty but never floaty.
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [enabled])

  return null
}
