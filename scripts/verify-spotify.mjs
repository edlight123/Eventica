#!/usr/bin/env node
/**
 * Verify a pair of Spotify Client Credentials, the same way the composer's
 * song search does.
 *
 * Song search on /create is a plain typeahead against /api/spotify/search,
 * which mints a client-credentials token server-side. Without credentials the
 * route answers 503 `not_configured` and the picker silently degrades to a
 * paste-a-URL field — correct behaviour, but indistinguishable from a bug if
 * you do not know to look for it. This says plainly which state you are in.
 *
 * Usage
 *   SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… node scripts/verify-spotify.mjs
 *   node scripts/verify-spotify.mjs            # reads .env.local if present
 *
 * Getting credentials (free, ~2 minutes, no user scopes, no redirect URI):
 *   1. developer.spotify.com/dashboard -> Create app
 *   2. Any name/description; tick "Web API"; redirect URI can be
 *      http://localhost:3000 (unused by client credentials)
 *   3. Settings -> Client ID, and "View client secret"
 *   4. Add both to Vercel (Production AND Preview), then REDEPLOY — they are
 *      read at request time, but a deploy is what picks up new env vars.
 */

import { readFileSync } from 'node:fs'

function fromEnvFile() {
  for (const f of ['.env.local', '.env']) {
    try {
      const out = {}
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(/^\s*(SPOTIFY_CLIENT_ID|SPOTIFY_CLIENT_SECRET)\s*=\s*(.*)\s*$/)
        if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
      if (out.SPOTIFY_CLIENT_ID || out.SPOTIFY_CLIENT_SECRET) return { file: f, ...out }
    } catch {}
  }
  return {}
}

const file = fromEnvFile()
const id = process.env.SPOTIFY_CLIENT_ID || file.SPOTIFY_CLIENT_ID
const secret = process.env.SPOTIFY_CLIENT_SECRET || file.SPOTIFY_CLIENT_SECRET

if (!id || !secret) {
  console.log('NOT CONFIGURED — no SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET found.')
  console.log('  Checked: process env' + (file.file ? ` and ${file.file}` : ''))
  console.log('  Song search will fall back to "paste a Spotify link" until these are set.')
  console.log('  See the header of this file for the two-minute setup.')
  process.exit(1)
}

console.log(`Client ID ...${String(id).slice(-6)}  (secret ${String(secret).length} chars)`)

const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
  },
  body: 'grant_type=client_credentials',
})

if (!tokenRes.ok) {
  const detail = await tokenRes.text().catch(() => '')
  console.log(`\nREJECTED — Spotify answered ${tokenRes.status}`)
  console.log(`  ${detail.slice(0, 300)}`)
  console.log('\n  400 invalid_client almost always means the ID and secret do not')
  console.log('  belong to the same app, or the secret was rotated in the dashboard.')
  process.exit(1)
}

const { access_token, expires_in } = await tokenRes.json()
console.log(`Token minted, valid ${expires_in}s.`)

// The real thing the composer does: search a track the catalogue would use.
const q = process.argv[2] || 'konpa'
const searchRes = await fetch(
  `https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: 'track', limit: '5' })}`,
  { headers: { Authorization: `Bearer ${access_token}` } }
)

if (!searchRes.ok) {
  console.log(`\nSEARCH FAILED — ${searchRes.status} ${(await searchRes.text()).slice(0, 200)}`)
  process.exit(1)
}

const items = (await searchRes.json())?.tracks?.items ?? []
console.log(`\nWORKS — "${q}" returned ${items.length} track(s):`)
for (const it of items) {
  console.log(`  ${it.name} — ${(it.artists || []).map((a) => a.name).join(', ')}`)
}
console.log('\nSet these two in Vercel (Production + Preview) and redeploy.')
