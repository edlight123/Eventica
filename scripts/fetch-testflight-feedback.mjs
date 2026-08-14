#!/usr/bin/env node
/**
 * Pull the latest TestFlight tester feedback (screenshots + comments) from the
 * App Store Connect API and download the images locally so they can be reviewed.
 *
 * Usage — put these three in .env.local once, then just run the script:
 *   ASC_ISSUER_ID=<uuid from App Store Connect -> Users and Access -> Integrations>
 *   ASC_KEY_ID=XA7DX3A8Z8
 *   ASC_KEY_PATH=~/Downloads/AuthKey_XA7DX3A8Z8.p8
 *
 *   node scripts/fetch-testflight-feedback.mjs [outDir]
 *
 * Any of them can still be overridden inline for a one-off run.
 *
 * The key must be an App Store Connect API key (Users and Access ->
 * Integrations), NOT an APNs key. Issuer ID is on that same page.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import dotenv from 'dotenv'

// Read .env.local first, like the other scripts, so the issuer id and key id can
// live there once instead of being retyped (or pasted into a chat) every run.
// Anything already in the environment wins, so an inline override still works.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const APP_ID = process.env.ASC_APP_ID || '6794334427' // Tikèm, from mobile/eas.json
const ISSUER_ID = process.env.ASC_ISSUER_ID
const KEY_ID = process.env.ASC_KEY_ID
const KEY_PATH = (process.env.ASC_KEY_PATH || '').replace(/^~/, os.homedir())
const OUT_DIR = process.argv[2] || path.join(process.cwd(), 'testflight-feedback')
const LIMIT = Number(process.env.ASC_LIMIT || 20)

if (!ISSUER_ID || !KEY_ID || !KEY_PATH) {
  console.error('Missing ASC_ISSUER_ID, ASC_KEY_ID, or ASC_KEY_PATH')
  process.exit(1)
}

function makeToken() {
  const privateKey = fs.readFileSync(KEY_PATH, 'utf8')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' }
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 15 * 60,
    aud: 'appstoreconnect-v1',
    // Scope-less token: works for any GET the key's role permits.
  }
  const b64 = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')
  const signingInput = `${b64(header)}.${b64(payload)}`
  const signature = crypto
    .createSign('SHA256')
    .update(signingInput)
    .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
    .toString('base64url')
  return `${signingInput}.${signature}`
}

const token = makeToken()

async function asc(urlPath) {
  const url = urlPath.startsWith('http')
    ? urlPath
    : `https://api.appstoreconnect.apple.com${urlPath}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}\n${text}`)
  }
  return JSON.parse(text)
}

function summarize(item) {
  const a = item.attributes || {}
  return {
    id: item.id,
    createdDate: a.createdDate,
    comment: a.comment || '',
    tester: a.email || '',
    device: [a.deviceModel, a.devicePlatform, a.osVersion].filter(Boolean).join(' / '),
    locale: a.locale,
    build: item.relationships?.build?.data?.id,
    screenWidth: a.screenWidthInPoints,
    screenHeight: a.screenHeightInPoints,
    screenshots: (a.screenshots || []).map((s) => ({
      fileName: s.fileName,
      url: s.url,
      fileSize: s.fileSize,
    })),
  }
}

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
  return buf.length
}

const screenshotPath = `/v1/apps/${APP_ID}/betaFeedbackScreenshotSubmissions?limit=${LIMIT}&sort=-createdDate`
const crashPath = `/v1/apps/${APP_ID}/betaFeedbackCrashSubmissions?limit=${LIMIT}&sort=-createdDate`

const screenshotFeedback = await asc(screenshotPath)
let crashFeedback = { data: [] }
try {
  crashFeedback = await asc(crashPath)
} catch (e) {
  console.error('(crash feedback fetch failed, continuing)', String(e).split('\n')[0])
}

fs.mkdirSync(OUT_DIR, { recursive: true })

const items = (screenshotFeedback.data || []).map(summarize)
for (const item of items) {
  for (const [i, shot] of item.screenshots.entries()) {
    const stamp = (item.createdDate || 'unknown').replace(/[:.]/g, '-')
    const name = `${stamp}_${item.id.slice(0, 8)}_${i + 1}.png`
    const dest = path.join(OUT_DIR, name)
    try {
      const bytes = await download(shot.url, dest)
      shot.localPath = dest
      console.log(`saved ${dest} (${Math.round(bytes / 1024)} KB)`)
    } catch (e) {
      console.error(`failed ${shot.fileName}: ${String(e).split('\n')[0]}`)
    }
  }
}

const report = {
  fetchedAt: new Date().toISOString(),
  appId: APP_ID,
  screenshotFeedbackCount: items.length,
  crashFeedbackCount: (crashFeedback.data || []).length,
  screenshotFeedback: items,
  crashFeedback: (crashFeedback.data || []).map((c) => ({
    id: c.id,
    createdDate: c.attributes?.createdDate,
    comment: c.attributes?.comment,
    device: c.attributes?.deviceModel,
    osVersion: c.attributes?.osVersion,
  })),
}
const reportPath = path.join(OUT_DIR, 'feedback.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(`\nwrote ${reportPath}`)
for (const item of items) {
  console.log(
    `\n[${item.createdDate}] ${item.tester || 'anonymous'} — ${item.device}\n  ${item.comment || '(no comment)'}\n  shots: ${item.screenshots.map((s) => s.localPath || s.fileName).join(', ')}`
  )
}
