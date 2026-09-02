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

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'

/** Route prefixes that keep native scroll: tools, flows, and auth. */
const NATIVE_SCROLL_PREFIXES = [
  '/admin',
  '/organizer',
  '/checkout',
  '/create',
  '/purchase',
  '/tickets',
  '/auth',
  '/scan',
  '/staff',
  '/settings',
  '/profile',
]

export default function SmoothScroll() {
  const pathname = usePathname() || '/'
  const enabled = !NATIVE_SCROLL_PREFIXES.some((p) => pathname.startsWith(p))
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      // The posh calibration: weighty but never floaty.
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenisRef.current = lenis

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [enabled])

  // Back/forward must NOT snap to top — the browser restores the reader's old
  // position on popstate, and forcing 0 there would lose their place.
  const popRef = useRef(false)
  useEffect(() => {
    const onPop = () => {
      popRef.current = true
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // New route: Next resets the window to the top, but the surviving Lenis
  // instance still holds the OLD position and would glide right back to it —
  // landing readers mid-page. Snap its internal state to the top as well.
  // (Query-only changes — e.g. /?city= filters — don't change the pathname,
  // so in-page filtering keeps its scroll position. On popstate, Lenis is
  // resynced to wherever the browser restored the window instead.)
  useEffect(() => {
    if (popRef.current) {
      popRef.current = false
      lenisRef.current?.scrollTo(window.scrollY, { immediate: true, force: true })
      return
    }
    lenisRef.current?.scrollTo(0, { immediate: true, force: true })
  }, [pathname])

  return null
}
