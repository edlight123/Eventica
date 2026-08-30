'use client'

// The organizer landing's hero right half: a fanned stack of REAL posters
// already selling on the platform, each radiating its own extracted color
// (the poster-glow signature). The pitch is the artwork itself — "your
// flyer belongs here" — so every poster links to its live event page.

import Link from 'next/link'
import Image from 'next/image'
import { usePosterAccent } from '@/components/ui/usePosterAccent'

interface FanEvent {
  id: string
  title: string
  banner_image_url: string
}

function FanPoster({ ev, className }: { ev: FanEvent; className: string }) {
  const accent = usePosterAccent(ev.banner_image_url)
  return (
    <Link
      href={`/events/${ev.id}`}
      prefetch={false}
      className={`absolute block aspect-[4/5] overflow-hidden rounded transition-opacity duration-200 hover:opacity-90 ${className}`}
      style={{ boxShadow: `0 0 56px -6px rgba(${accent},0.35)` }}
    >
      <Image
        src={ev.banner_image_url}
        alt={ev.title}
        fill
        sizes="240px"
        quality={70}
        className="object-cover"
      />
    </Link>
  )
}

export default function HeroPosterFan({ events }: { events: FanEvent[] }) {
  const [a, b, c] = events || []
  if (!a || !b || !c) return null
  return (
    <div aria-label="Posters from events on Tikèm" className="relative isolate h-[440px]">
      <FanPoster ev={b} className="left-0 top-12 z-0 w-[190px] -rotate-6 opacity-85" />
      <FanPoster ev={c} className="right-0 top-20 z-0 w-[180px] rotate-6 opacity-85" />
      <FanPoster ev={a} className="left-1/2 top-0 z-10 w-[235px] -translate-x-1/2" />
    </div>
  )
}
