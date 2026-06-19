#!/usr/bin/env node
/**
 * Deploy Firestore security rules + composite indexes WITHOUT the Firebase CLI,
 * using the service-account credentials in FIREBASE_SERVICE_ACCOUNT_KEY.
 *
 * Why this exists: this workspace's interactive `firebase login` is expired, and
 * the admin service account lacks the `serviceusage` permission that the CLI uses
 * to verify the Firestore API is enabled (so `firebase deploy` 403s). The
 * Firestore Admin + Firebase Rules REST APIs work fine with the service account,
 * so we call them directly. This is the programmatic equivalent of:
 *   firebase deploy --only firestore:rules,firestore:indexes
 *
 * Usage:
 *   node -r dotenv/config scripts/deploy-firestore-rest.js dotenv_config_path=.env.local
 *
 * Idempotent: indexes that already exist return ALREADY_EXISTS and are counted
 * as "exists" rather than treated as errors.
 */

const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')

const ROOT = path.resolve(__dirname, '..')

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    console.error(
      'Missing FIREBASE_SERVICE_ACCOUNT_KEY.\n' +
        'Run with: node -r dotenv/config scripts/deploy-firestore-rest.js dotenv_config_path=.env.local'
    )
    process.exit(1)
  }
  return JSON.parse(raw)
}

async function applyIndexes(projectId, authHeader) {
  const indexesDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'firestore.indexes.json'), 'utf8'))
  const indexes = Array.isArray(indexesDoc.indexes) ? indexesDoc.indexes : []
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups`

  let created = 0
  let exists = 0
  let skipped = 0
  let failed = 0

  console.log(`\nIndexes: applying ${indexes.length} composite index definitions...`)
  for (const idx of indexes) {
    const cg = idx.collectionGroup
    const body = { queryScope: idx.queryScope || 'COLLECTION', fields: idx.fields || [] }
    try {
      const res = await fetch(`${base}/${cg}/indexes`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        created++
        console.log(`  + created  ${cg} [${(idx.fields || []).map((f) => f.fieldPath).join(', ')}]`)
        continue
      }
      const text = await res.text()
      if (res.status === 409 || /already exists/i.test(text)) {
        exists++
        continue
      }
      // The implicit single-field __name__ index is rejected as "not necessary".
      if (/not necessary|already covered/i.test(text)) {
        skipped++
        continue
      }
      failed++
      console.warn(`  ! ${cg}: HTTP ${res.status} ${text.slice(0, 200)}`)
    } catch (e) {
      failed++
      console.warn(`  ! ${cg}: ${e.message}`)
    }
  }
  console.log(`  => created=${created} exists=${exists} skipped=${skipped} failed=${failed}`)
  return failed
}

async function releaseRules(projectId, rulesetName, authHeader) {
  const relPath = `projects/${projectId}/releases/cloud.firestore`
  const url = `https://firebaserules.googleapis.com/v1/${relPath}`
  const attempts = []

  // 1) PATCH with bare Release body.
  let r = await fetch(url, {
    method: 'PATCH',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: relPath, rulesetName }),
  })
  if (r.ok) return 'patched (bare)'
  attempts.push(`patch-bare ${r.status}: ${(await r.text()).slice(0, 160)}`)

  // 2) PATCH with wrapped { release: ... }.
  r = await fetch(url, {
    method: 'PATCH',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ release: { name: relPath, rulesetName } }),
  })
  if (r.ok) return 'patched (wrapped)'
  attempts.push(`patch-wrapped ${r.status}: ${(await r.text()).slice(0, 160)}`)

  // 3) POST create (release did not exist yet).
  r = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: relPath, rulesetName }),
  })
  if (r.ok) return 'created'
  attempts.push(`post-create ${r.status}: ${(await r.text()).slice(0, 160)}`)

  throw new Error('Failed to release rules:\n  ' + attempts.join('\n  '))
}

async function applyRules(projectId, authHeader) {
  const rulesContent = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')
  console.log('\nRules: creating ruleset...')
  const rulesetRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: rulesContent }] } }),
    }
  )
  if (!rulesetRes.ok) {
    const t = await rulesetRes.text()
    throw new Error(`Failed to create ruleset: HTTP ${rulesetRes.status} ${t.slice(0, 300)}`)
  }
  const ruleset = await rulesetRes.json()
  console.log(`  ruleset created: ${ruleset.name}`)
  const how = await releaseRules(projectId, ruleset.name, authHeader)
  console.log(`  released to cloud.firestore (${how})`)
}

async function main() {
  const sa = loadServiceAccount()
  const projectId = sa.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('Could not determine project id')
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) })

  const { access_token: token } = await admin.credential.cert(sa).getAccessToken()
  const authHeader = { Authorization: 'Bearer ' + token }

  console.log(`Deploying Firestore rules + indexes to '${projectId}' (service account)...`)
  const failed = await applyIndexes(projectId, authHeader)
  await applyRules(projectId, authHeader)

  console.log('\nFirestore deploy complete.')
  if (failed > 0) {
    console.log(`(${failed} index definition(s) reported errors above — review if unexpected.)`)
  }
}

main().catch((e) => {
  console.error('\nDeploy failed:', e.message)
  process.exit(1)
})
