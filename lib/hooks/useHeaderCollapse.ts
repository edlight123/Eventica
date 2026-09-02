'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Collapse-on-scroll-down, restore-on-scroll-up for a sticky header.
 *
 * Why collapse rather than fade: a faded bar still occupies its space — on a
 * phone that is ~100px of dead screen above the feed — and a faded control that
 * still accepts taps is worse than one that is gone. Collapsing reclaims the
 * height and removes the target; scrolling up even slightly brings it straight
 * back, so nothing is ever more than a flick away.
 *
 * Three rules keep it from ever fighting the reader:
 *  - Never collapsed near the top of the page (there is nothing to reclaim yet).
 *  - Never collapses while focus is inside the header — otherwise typing in the
 *    search box, or arrowing through its suggestions, could yank the field away
 *    mid-interaction.
 *  - A dead zone means small jitter (trackpad noise, momentum settle) does not
 *    flip the state.
 *
 * One rAF-throttled scroll listener, reading window.scrollY, which Lenis keeps
 * accurate on the smooth-scrolled public surfaces.
 */
export function useHeaderCollapse(
  ref: React.RefObject<HTMLElement | null>,
  {
    /** Don't collapse until the reader is this far down. */
    threshold = 220,
    /** Ignore direction changes smaller than this many px. */
    deadZone = 8,
  }: { threshold?: number; deadZone?: number } = {}
) {
  const [collapsed, setCollapsed] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Reduced motion: the collapse is motion the reader didn't ask for. Leave
    // the header fully expanded and skip the listener entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    lastY.current = window.scrollY
    let raf = 0

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        const delta = y - lastY.current

        if (Math.abs(delta) < deadZone) return
        lastY.current = y

        // Never move the header out from under someone actively using it. But
        // "in use" is narrower than "focused": clicking the search box and then
        // scrolling to browse is common, and a focused-but-empty field must not
        // pin the header open forever. So it holds only while a suggestion list
        // is open or the focused field actually has text in it.
        const el = ref.current
        const active = document.activeElement as HTMLElement | null
        if (el && active && el.contains(active)) {
          const typing =
            !!el.querySelector('[role="listbox"]') ||
            !!(active as HTMLInputElement).value
          if (typing) {
            setCollapsed(false)
            return
          }
        }

        if (y <= threshold) {
          setCollapsed(false)
          return
        }
        setCollapsed(delta > 0)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref, threshold, deadZone])

  return collapsed
}
