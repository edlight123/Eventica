#!/usr/bin/env node
/**
 * List recent App Store Connect builds with their processing state, so you can
 * tell "still processing" from "invalid" from "never arrived".
 *
 * Usage:
 *   ASC_ISSUER_ID=<uuid> ASC_KEY_ID=<kid> ASC_KEY_PATH=<path.p8> \
 *   node scripts/asc-builds.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'

const APP_ID = process.env.ASC_APP_ID || '6794334427'
const ISSUER_ID = process.env.ASC_ISSUER_ID
const KEY_ID = process.env.ASC_KEY_ID
const KEY_PATH = (process.env.ASC_KEY_PATH || '').replace(/^~/, os.homedir())

if (!ISSUER_ID || !KEY_ID || !KEY_PATH) {
  console.error('Missing ASC_ISSUER_ID, ASC_KEY_ID, or ASC_KEY_PATH')
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

async function asc(path) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}\n${text}`)
  return JSON.parse(text)
}

// Builds, newest first, with the pre-release version they belong to.
const builds = await asc(
  `/v1/builds?filter[app]=${APP_ID}&limit=10&sort=-version&include=preReleaseVersion`
)

const versionById = new Map(
  (builds.included || [])
    .filter((i) => i.type === 'preReleaseVersions')
    .map((i) => [i.id, i.attributes?.version])
)

console.log(`\n${(builds.data || []).length} recent build(s) for app ${APP_ID}:\n`)
for (const b of builds.data || []) {
  const a = b.attributes || {}
  const vId = b.relationships?.preReleaseVersion?.data?.id
  console.log(
    [
      `build ${a.version}`,
      `app version ${versionById.get(vId) || '?'}`,
      `state=${a.processingState}`,
      `expired=${a.expired}`,
      `uploaded=${a.uploadedDate}`,
      `expires=${a.expirationDate}`,
      a.usesNonExemptEncryption === null
        ? 'encryption=UNANSWERED'
        : `encryption=${a.usesNonExemptEncryption}`,
    ].join('  ')
  )
}

// Whether anything is actually available to testers.
try {
  const groups = await asc(`/v1/apps/${APP_ID}/betaGroups?limit=10`)
  console.log(`\nbeta groups: ${(groups.data || []).length}`)
  for (const g of groups.data || []) {
    const at = g.attributes || {}
    console.log(`  - ${at.name}  internal=${at.isInternalGroup}  publicLink=${at.publicLinkEnabled}`)
    // Which builds this group can actually install — the thing that decides
    // whether a tester sees the new build at all.
    try {
      const gb = await asc(`/v1/betaGroups/${g.id}/builds?limit=10`)
      const list = (gb.data || []).map((b) => b.attributes?.version).join(', ') || '(none)'
      console.log(`      builds assigned: ${list}`)
    } catch (e) {
      console.error(`      (build list failed) ${String(e).split('\n')[0]}`)
    }
    // Testers in the group.
    try {
      const t = await asc(`/v1/betaGroups/${g.id}/betaTesters?limit=10`)
      const emails = (t.data || []).map((x) => x.attributes?.email).filter(Boolean)
      console.log(`      testers (${emails.length}): ${emails.join(', ') || '(none)'}`)
    } catch (e) {
      console.error(`      (tester list failed) ${String(e).split('\n')[0]}`)
    }
  }
} catch (e) {
  console.error('\n(beta group fetch failed)', String(e).split('\n')[0])
}
