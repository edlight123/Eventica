import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Spotify track typeahead for the event composer.
 *
 * The composer used to ask organizers to paste an open.spotify.com URL by hand.
 * This route backs a real song search instead — and because the Client
 * Credentials secret must never reach a browser, every keystroke is proxied
 * here rather than hitting api.spotify.com from the client.
 *
 * Needs SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET (a free app at
 * developer.spotify.com; no user scopes, no redirect URI required). Without
 * them the route answers 503 `not_configured` and the UI quietly falls back to
 * the paste-a-URL input, so an organizer is never blocked. Run
 * `node scripts/verify-spotify.mjs` to check a pair of credentials.
 *
 * Open to signed-out callers, throttled per IP — see the note on
 * `guestThrottled`. /create is the guest composer, so requiring auth here
 * disabled song search for most of the people who reach it.
 */

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SEARCH_URL = 'https://api.spotify.com/v1/search'

const MAX_Q = 120
const MAX_LIMIT = 10
const DEFAULT_LIMIT = 8

export type SpotifyTrackResult = {
  id: string
  name: string
  artists: string
  album: string
  albumArt: string | null
  /** Always the canonical shape parseSpotifyUrl() accepts. */
  url: string
  durationMs: number
}

// ── Token cache ───────────────────────────────────────────────────────────
// Client-credentials tokens last ~3600s. Cached in module scope (per lambda
// instance) so a typeahead session mints one token, not one per keystroke.
// `inflight` collapses the thundering herd when several requests race a cold
// cache at once.
let cachedToken: string | null = null
let cachedTokenExpiry = 0
let inflight: Promise<string> | null = null

const EXPIRY_SKEW_MS = 60_000

/**
 * Best-effort per-IP throttle for SIGNED-OUT callers (per warm serverless
 * instance): 40 searches / 5 min. Same shape and same caveat as
 * /api/guest-upload, which exists for exactly the same reason.
 *
 * This replaces a flat `if (!user) 401`. The gate was there to stop this
 * becoming an open Spotify proxy, which is a real concern — but /create is
 * DELIBERATELY the signed-out composer ("anyone can compose their event here,
 * signed out"), so the gate rejected precisely the people the page is built
 * for. Every guest got a 401, the picker read that as "search unavailable" and
 * dropped to its paste-a-URL fallback, and the two symptoms the owner reported
 * are that fallback exactly: a URL keyboard (inputMode="url", correct for
 * pasting a link) and no suggestions (there is no typeahead in that mode).
 *
 * 40 in five minutes is far more than a person typing behind a 250ms debounce
 * will ever spend, and useless as a scraping proxy at 8/min.
 */
const guestHits = new Map<string, number[]>()
const GUEST_WINDOW_MS = 5 * 60_000
const GUEST_MAX = 40

function guestThrottled(ip: string): boolean {
  const now = Date.now()
  const list = (guestHits.get(ip) || []).filter((t) => t > now - GUEST_WINDOW_MS)
  if (list.length >= GUEST_MAX) {
    guestHits.set(ip, list)
    return true
  }
  list.push(now)
  guestHits.set(ip, list)
  if (guestHits.size > 5000) guestHits.clear() // crude memory bound
  return false
}

function credentials(): { id: string; secret: string } | null {
  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret) return null
  return { id, secret }
}

async function mintToken(id: string, secret: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    // Bad/rotated credentials land here (Spotify answers 400 invalid_client).
    const detail = await res.text().catch(() => '')
    const err = new Error(`spotify token ${res.status} ${detail.slice(0, 200)}`) as Error & {
      spotifyStatus?: number
    }
    err.spotifyStatus = res.status
    throw err
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('spotify token response had no access_token')

  cachedToken = data.access_token
  cachedTokenExpiry = Date.now() + Math.max(0, (data.expires_in ?? 3600) * 1000) - EXPIRY_SKEW_MS
  return cachedToken
}

async function getToken(id: string, secret: string, force = false): Promise<string> {
  if (force) {
    cachedToken = null
    cachedTokenExpiry = 0
    inflight = null
  }
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken
  if (!inflight) {
    inflight = mintToken(id, secret).finally(() => {
      inflight = null
    })
  }
  return inflight
}

function mapTrack(track: any): SpotifyTrackResult | null {
  const id = typeof track?.id === 'string' ? track.id : ''
  if (!id) return null

  const images: any[] = Array.isArray(track?.album?.images) ? track.album.images : []
  // Smallest image that still looks sharp in a ~40px row: Spotify returns
  // 640/300/64 — take the last (64px) and fall back upward.
  const albumArt = images.length ? images[images.length - 1]?.url || images[0]?.url || null : null

  return {
    id,
    name: String(track?.name || '').slice(0, 200),
    artists: (Array.isArray(track?.artists) ? track.artists : [])
      .map((a: any) => String(a?.name || ''))
      .filter(Boolean)
      .join(', ')
      .slice(0, 200),
    album: String(track?.album?.name || '').slice(0, 200),
    albumArt: typeof albumArt === 'string' ? albumArt : null,
    // Built locally rather than trusting external_urls, so the value always
    // matches what components/events/SpotifyEmbed.tsx#parseSpotifyUrl accepts.
    url: `https://open.spotify.com/track/${id}`,
    durationMs: Number.isFinite(track?.duration_ms) ? Number(track.duration_ms) : 0,
  }
}

export async function GET(request: Request) {
  // Signed-in organizers pass freely; guests are throttled per IP rather than
  // turned away, because the guest composer is a first-class surface here.
  const user = await getCurrentUser().catch(() => null)
  if (!user) {
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
    if (guestThrottled(ip)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
  }

  const creds = credentials()
  if (!creds) {
    console.warn(
      '[spotify/search] not configured — set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (free app at developer.spotify.com) to enable song search; the composer falls back to pasting a Spotify URL.'
    )
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim().slice(0, MAX_Q)
  if (q.length < 2) return NextResponse.json({ tracks: [] })

  const limitRaw = Number(searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limitRaw)))
    : DEFAULT_LIMIT

  const url = `${SEARCH_URL}?${new URLSearchParams({
    q,
    type: 'track',
    limit: String(limit),
  })}`

  try {
    let token = await getToken(creds.id, creds.secret)
    let res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    // An expired/revoked token: refresh once and retry, then give up.
    if (res.status === 401) {
      token = await getToken(creds.id, creds.secret, true)
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn('[spotify/search] search failed', res.status, detail.slice(0, 200))
      // 429 is worth surfacing distinctly so the UI can back off instead of
      // pretending Spotify is misconfigured.
      const status = res.status === 429 ? 429 : 502
      return NextResponse.json({ error: status === 429 ? 'rate_limited' : 'search_failed' }, { status })
    }

    const data = (await res.json()) as any
    const items: any[] = Array.isArray(data?.tracks?.items) ? data.tracks.items : []
    const tracks = items.map(mapTrack).filter(Boolean) as SpotifyTrackResult[]

    return NextResponse.json({ tracks })
  } catch (error: any) {
    // Bad credentials are a configuration problem, not a server fault — report
    // them as such so the picker degrades to the paste-a-URL input.
    if (error?.spotifyStatus === 400 || error?.spotifyStatus === 401) {
      console.warn(
        '[spotify/search] Spotify rejected SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET — song search disabled until they are corrected.',
        error?.message
      )
      return NextResponse.json({ error: 'not_configured' }, { status: 503 })
    }
    console.warn('[spotify/search] unavailable', error?.message || error)
    return NextResponse.json({ error: 'search_failed' }, { status: 502 })
  }
}
