#!/usr/bin/env node
/**
 * Assign an uploaded build to a TestFlight beta group.
 *
 * EAS `--auto-submit` uploads the binary to App Store Connect but does NOT
 * distribute it, so testers never see it. This does that last step.
 *
 * Usage:
 *   ASC_ISSUER_ID=<uuid> ASC_KEY_ID=<kid> ASC_KEY_PATH=<path.p8> \
 *   node scripts/asc-distribute-build.mjs <buildVersion> "<groupName>"
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'

const APP_ID = process.env.ASC_APP_ID || '6794334427'
const ISSUER_ID = process.env.ASC_ISSUER_ID
const KEY_ID = process.env.ASC_KEY_ID
const KEY_PATH = (process.env.ASC_KEY_PATH || '').replace(/^~/, os.homedir())
const BUILD_VERSION = process.argv[2]
const GROUP_NAME = process.argv[3]

if (!ISSUER_ID || !KEY_ID || !KEY_PATH || !BUILD_VERSION || !GROUP_NAME) {
  console.error('Usage: ASC_* env + node scripts/asc-distribute-build.mjs <buildVersion> "<groupName>"')
  process.exit(1)
}

const now = Math.floor(Date.now() / 1000)
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const signingInput = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({
  iss: ISSUER_ID,
  iat: now,
  exp: now + 900,
  aud: 'appstoreconnect-v1',
})}`
const token = `${signingInput}.${crypto
  .createSign('SHA256')
  .update(signingInput)
  .sign({ key: fs.readFileSync(KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' })
  .toString('base64url')}`

async function asc(path, init = {}) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}\n${text}`)
  return text ? JSON.parse(text) : null
}

const builds = await asc(`/v1/builds?filter[app]=${APP_ID}&filter[version]=${BUILD_VERSION}&limit=1`)
const build = (builds.data || [])[0]
if (!build) throw new Error(`build ${BUILD_VERSION} not found for app ${APP_ID}`)
if (build.attributes?.processingState !== 'VALID') {
  throw new Error(`build ${BUILD_VERSION} is ${build.attributes?.processingState}, not VALID yet`)
}

const groups = await asc(`/v1/apps/${APP_ID}/betaGroups?limit=20`)
const group = (groups.data || []).find((g) => g.attributes?.name === GROUP_NAME)
if (!group) {
  throw new Error(
    `group "${GROUP_NAME}" not found. Available: ${(groups.data || [])
      .map((g) => g.attributes?.name)
      .join(', ')}`
  )
}

const before = await asc(`/v1/betaGroups/${group.id}/builds?limit=10`)
console.log(
  `before: ${(before.data || []).map((b) => b.attributes?.version).join(', ') || '(none)'}`
)

await asc(`/v1/betaGroups/${group.id}/relationships/builds`, {
  method: 'POST',
  body: JSON.stringify({ data: [{ type: 'builds', id: build.id }] }),
})

const after = await asc(`/v1/betaGroups/${group.id}/builds?limit=10`)
console.log(
  `after:  ${(after.data || []).map((b) => b.attributes?.version).join(', ') || '(none)'}`
)
console.log(
  `\nbuild ${BUILD_VERSION} -> "${GROUP_NAME}" ${
    (after.data || []).some((b) => b.attributes?.version === String(BUILD_VERSION))
      ? 'ASSIGNED ✓'
      : 'NOT assigned ✗'
  }`
)
