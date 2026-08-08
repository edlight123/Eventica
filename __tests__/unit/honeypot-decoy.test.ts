/**
 * @jest-environment node
 */

/**
 * Tests for the honeypot decoy responder.
 *
 * The contract this locks in: a decoy must return **404** while still logging
 * the hit and still serving believable fake content.
 *
 * Serving decoys with HTTP 200 made every external security scanner report
 * `/.env`, `/.git/HEAD`, `/.aws/credentials`, `/server-status` and the `*.sql`
 * paths as CRITICAL "exposed sensitive path" findings — a scanner's only test
 * is "did this path return 200?". The security value of the honeypot is the
 * `[honeypot]` log line, which fires either way, so 404 costs us nothing real
 * and clears a permanent shelf of false-positive criticals.
 */

import { NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextConfig = require('../../next.config.js')
import * as honeypot from '../../app/api/honeypot/[[...slug]]/route'

const ORIGIN = 'https://www.tikem.co'

/** Invoke the handler the way the next.config.js rewrite does. */
function call(path: string, init?: RequestInit) {
  const slug = path.replace(/^\//, '').split('/')
  const req = new NextRequest(`${ORIGIN}/api/honeypot${path}`, init as any)
  return honeypot.GET(req, { params: Promise.resolve({ slug }) })
}

/**
 * Every path next.config.js rewrites into the honeypot. Derived from the real
 * config rather than hardcoded, so a newly added decoy path is covered
 * automatically instead of silently shipping a 200.
 */
async function decoyPaths(): Promise<string[]> {
  const rewrites: Array<{ source: string; destination: string }> = await nextConfig.rewrites()
  return rewrites
    .filter((r) => r.destination.startsWith('/api/honeypot'))
    .map((r) => r.source)
}

let warn: jest.SpyInstance

beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
})

describe('honeypot decoys never return 200', () => {
  it('has decoy paths configured', async () => {
    expect((await decoyPaths()).length).toBeGreaterThan(0)
  })

  it('returns 404 for every rewritten probe path', async () => {
    const paths = await decoyPaths()
    const statuses = await Promise.all(
      paths.map(async (p) => [p, (await call(p)).status] as const)
    )

    // Assert on the whole map so a failure names every offending path at once.
    expect(Object.fromEntries(statuses)).toEqual(
      Object.fromEntries(paths.map((p) => [p, 404]))
    )
  })

  it.each([
    '/.env',
    '/.env.local',
    '/.git/HEAD',
    '/.git/config',
    '/.aws/credentials',
    '/server-status',
    '/backup.sql',
    '/database.sql',
    '/wp-login.php',
    '/phpmyadmin',
  ])('404s the scanner-flagged path %s', async (path) => {
    expect((await call(path)).status).toBe(404)
  })
})

describe('deception is preserved', () => {
  it('still serves fake .env content in the body', async () => {
    const body = await (await call('/.env')).text()

    expect(body).toContain('DB_PASSWORD=')
    // The fake secrets are explicitly labelled as decoys so a reader who does
    // get hold of them cannot mistake them for real credentials.
    expect(body).toContain('honeypot-not-a-real-secret')
    expect(body).toContain('this_value_is_a_decoy')
  })

  it('still serves a fake WordPress login page', async () => {
    const res = await call('/wp-login.php')

    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    expect(await res.text()).toContain('WordPress')
  })

  it('never caches a decoy response', async () => {
    expect((await call('/.env')).headers.get('cache-control')).toBe('no-store')
  })
})

describe('logging still fires (the actual security signal)', () => {
  it('emits one structured [honeypot] line per hit', async () => {
    await call('/.env')

    expect(warn).toHaveBeenCalledTimes(1)
    const line = warn.mock.calls[0][0] as string
    expect(line).toMatch(/^\[honeypot\] /)

    const record = JSON.parse(line.replace('[honeypot] ', ''))
    expect(record).toMatchObject({ path: '/.env', kind: 'dotenv', method: 'GET' })
  })

  it('captures submitted credentials without storing the password', async () => {
    const req = new NextRequest(`${ORIGIN}/api/honeypot/wp-login.php`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ log: 'admin', pwd: 'hunter2' }),
    })
    await honeypot.POST(req, { params: Promise.resolve({ slug: ['wp-login.php'] }) })

    const record = JSON.parse((warn.mock.calls[0][0] as string).replace('[honeypot] ', ''))
    expect(record.username).toBe('admin')
    expect(record.passwordLength).toBe('hunter2'.length)
    // The password itself must never be logged.
    expect(warn.mock.calls[0][0]).not.toContain('hunter2')
  })
})
