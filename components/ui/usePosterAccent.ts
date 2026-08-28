'use client'

// The poster-glow's color source: the dominant color of a poster image,
// extracted client-side from the SAME-ORIGIN next/image thumbnail (so the
// canvas is never tainted), cached per URL for the session. Returns an
// "r,g,b" triple for CSS `rgba(var(--pg), α)` composition — the card decides
// the alpha for rest vs hover. Falls back to the brand teal triple, so a
// missing image or a failed decode still glows softly instead of breaking.

import { useEffect, useState } from 'react'

export const POSTER_ACCENT_FALLBACK = '20,184,166'

export function usePosterAccent(imageUrl?: string | null): string {
  const [accent, setAccent] = useState<string>(POSTER_ACCENT_FALLBACK)

  useEffect(() => {
    if (!imageUrl) return
    let cancelled = false
    const key = `tikem_accent:${imageUrl}`

    try {
      const cached = sessionStorage.getItem(key)
      if (cached) {
        setAccent(cached)
        return
      }
    } catch {
      // Storage unavailable — extract every time, still cheap.
    }

    const img = new window.Image()
    // 48px is one of next/image's default imageSizes, so this hits the same
    // optimizer cache the visible posters warm up.
    img.src = `/_next/image?url=${encodeURIComponent(imageUrl)}&w=48&q=30`
    img.onload = () => {
      try {
        const size = 12
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        // The most saturated AND lit pixel is the poster's "voice" — a dark
        // saturated pixel must not win, because a dark glow is invisible on the
        // black canvas. A flat/monochrome poster falls back to its average.
        let bestScore = 0
        let best: [number, number, number] | null = null
        let sr = 0, sg = 0, sb = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
          const sat = mx === 0 ? 0 : (mx - mn) / mx
          const score = sat * Math.min(1, mx / 150)
          sr += r; sg += g; sb += b; n += 1
          if (score > bestScore) {
            bestScore = score
            best = [r, g, b]
          }
        }
        let [r, g, b] =
          bestScore > 0.14 && best ? best : [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)]
        // Lift toward luminous while keeping the hue: the glow is light cast by
        // the poster, so it must read against #0A0A0A even for moody artwork.
        const peak = Math.max(r, g, b, 1)
        if (peak < 200) {
          const k = 200 / peak
          r = Math.min(255, Math.round(r * k))
          g = Math.min(255, Math.round(g * k))
          b = Math.min(255, Math.round(b * k))
        }
        const value = `${r},${g},${b}`
        if (!cancelled) setAccent(value)
        try {
          sessionStorage.setItem(key, value)
        } catch {}
      } catch {
        // Decode/read failure — the teal fallback stands.
      }
    }

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return accent
}
