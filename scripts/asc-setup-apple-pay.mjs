#!/usr/bin/env node
/**
 * Provision the Apple side of Apple Pay for the iOS app.
 *
 * Two things must exist in the Apple Developer account before the PaymentSheet
 * wallet button will render:
 *   1. a Merchant ID matching the `com.apple.developer.in-app-payments`
 *      entitlement (written by the Stripe config plugin in mobile/app.json)
 *   2. the APPLE_PAY capability on the app's Bundle ID
 *
 * Both are creatable through the App Store Connect API, so this script does
 * them rather than leaving you clicking through the portal.
 *
 * Dry run by default — it prints what it WOULD create and changes nothing:
 *   node scripts/asc-setup-apple-pay.mjs
 *
 * Apply:
 *   node scripts/asc-setup-apple-pay.mjs --apply
 *
 * Third step, once you have Stripe's CSR — uploads it to Apple and writes the
 * issued payment processing certificate next to the CSR, so you never open the
 * Apple portal. Upload that .cer back to Stripe to finish.
 *   node scripts/asc-setup-apple-pay.mjs --csr ~/Downloads/stripe.certSigningRequest
 *
 * Credentials come from .env.local (ASC_ISSUER_ID, ASC_KEY_ID, ASC_KEY_PATH),
 * the same ones scripts/fetch-testflight-feedback.mjs uses.
 *
 * NOTE: enabling a capability invalidates existing provisioning profiles. That
 * is expected — EAS regenerates them on the next build. It is also why this
 * needs a fresh native build, not an OTA update.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const ISSUER_ID = process.env.ASC_ISSUER_ID
const KEY_ID = process.env.ASC_KEY_ID
const KEY_PATH = (process.env.ASC_KEY_PATH || '').replace(/^~/, os.homedir())

/** Must match APPLE_PAY_MERCHANT_ID in mobile/components/PaymentModal.tsx. */
const MERCHANT_IDENTIFIER = process.env.APPLE_PAY_MERCHANT_ID || 'merchant.co.tikem'
const MERCHANT_NAME = 'Tikem'
const BUNDLE_IDENTIFIER = process.env.IOS_BUNDLE_ID || 'co.tikem.mobile'

const APPLY = process.argv.includes('--apply')

const csrFlagIndex = process.argv.indexOf('--csr')
const CSR_PATH =
  csrFlagIndex === -1 ? null : (process.argv[csrFlagIndex + 1] || '').replace(/^~/, os.homedir())
if (csrFlagIndex !== -1 && !CSR_PATH) {
  console.error('--csr needs a path to the .certSigningRequest Stripe gave you')
  process.exit(1)
}

if (!ISSUER_ID || !KEY_ID || !KEY_PATH) {
  console.error('Missing ASC_ISSUER_ID, ASC_KEY_ID, or ASC_KEY_PATH (check .env.local)')
  process.exit(1)
}

function makeToken() {
  const now = Math.floor(Date.now() / 1000)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const signingInput = `${b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64({
    iss: ISSUER_ID,
    iat: now,
    exp: now + 900,
    aud: 'appstoreconnect-v1',
  })}`
  const signature = crypto
    .createSign('SHA256')
    .update(signingInput)
    .sign({ key: fs.readFileSync(KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' })
    .toString('base64url')
  return `${signingInput}.${signature}`
}

const token = makeToken()

async function asc(method, urlPath, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let parsed
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    parsed = { raw: text.slice(0, 500) }
  }
  return { ok: res.ok, status: res.status, body: parsed }
}

/** Apple returns errors as a list of {title, detail}; surface the detail. */
function explain(result) {
  const errors = result.body?.errors
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => `${e.title}: ${e.detail}`).join('; ')
  }
  return `HTTP ${result.status} ${JSON.stringify(result.body).slice(0, 300)}`
}

console.log(APPLY ? '── APPLYING ──' : '── DRY RUN (pass --apply to make changes) ──')

// ---------------------------------------------------------------- merchant id
const merchants = await asc('GET', '/v1/merchantIds?limit=200')
if (!merchants.ok) {
  console.error('Could not list merchant ids —', explain(merchants))
  process.exit(1)
}

const existingMerchant = (merchants.body.data || []).find(
  (m) => m.attributes?.identifier === MERCHANT_IDENTIFIER
)

console.log(`\nMerchant IDs in the account: ${(merchants.body.data || []).length}`)
for (const m of merchants.body.data || []) {
  console.log(`  - ${m.attributes?.identifier}  (${m.attributes?.name})`)
}

let merchantRecordId = existingMerchant?.id || null

if (existingMerchant) {
  console.log(`\n✓ ${MERCHANT_IDENTIFIER} already exists (${existingMerchant.id})`)
} else if (!APPLY) {
  console.log(`\n→ would create merchant id ${MERCHANT_IDENTIFIER} ("${MERCHANT_NAME}")`)
} else {
  const created = await asc('POST', '/v1/merchantIds', {
    data: {
      type: 'merchantIds',
      attributes: { name: MERCHANT_NAME, identifier: MERCHANT_IDENTIFIER },
    },
  })
  if (created.ok) {
    merchantRecordId = created.body?.data?.id
    console.log(`\n✓ created merchant id ${MERCHANT_IDENTIFIER} (${merchantRecordId})`)
  } else {
    console.error(`\n✗ creating ${MERCHANT_IDENTIFIER} failed —`, explain(created))
    process.exitCode = 1
  }
}

// ------------------------------------------- Apple Pay processing certificate
if (CSR_PATH) {
  if (!merchantRecordId) {
    console.error(`\n✗ ${MERCHANT_IDENTIFIER} does not exist yet — run with --apply first`)
    process.exit(1)
  }
  if (!fs.existsSync(CSR_PATH)) {
    console.error(`\n✗ no CSR at ${CSR_PATH}`)
    process.exit(1)
  }

  const existingCerts = await asc('GET', `/v1/merchantIds/${merchantRecordId}/certificates`)
  const certCount = (existingCerts.body?.data || []).length
  console.log(`\nCertificates already on ${MERCHANT_IDENTIFIER}: ${certCount}`)

  // Apple wants the PEM body without the BEGIN/END armour or line breaks.
  const csrContent = fs
    .readFileSync(CSR_PATH, 'utf8')
    .replace(/-----(BEGIN|END) CERTIFICATE REQUEST-----/g, '')
    .replace(/\s+/g, '')

  if (!APPLY) {
    console.log(`→ would upload ${path.basename(CSR_PATH)} as an APPLE_PAY certificate`)
  } else {
    // APPLE_PAY is the payment PROCESSING certificate, which is the one Stripe
    // needs to decrypt tokens. APPLE_PAY_MERCHANT_IDENTITY is a different thing
    // (web merchant validation) and will not work here.
    const cert = await asc('POST', '/v1/certificates', {
      data: {
        type: 'certificates',
        attributes: { certificateType: 'APPLE_PAY', csrContent },
        relationships: { merchantId: { data: { type: 'merchantIds', id: merchantRecordId } } },
      },
    })
    if (cert.ok) {
      const content = cert.body?.data?.attributes?.certificateContent
      const out = CSR_PATH.replace(/\.[^.]+$/, '') + '-apple-pay.cer'
      fs.writeFileSync(out, Buffer.from(content, 'base64'))
      console.log(`✓ Apple issued the certificate → ${out}`)
      console.log('  Upload that file back to Stripe to finish.')
    } else {
      console.error('✗ certificate creation failed —', explain(cert))
      process.exitCode = 1
    }
  }
}

// ------------------------------------------------------- bundle id capability
const bundles = await asc(
  'GET',
  `/v1/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_IDENTIFIER)}&limit=5`
)
const bundle = bundles.body?.data?.[0]
if (!bundle) {
  console.error(`\n✗ bundle id ${BUNDLE_IDENTIFIER} not found —`, explain(bundles))
  process.exit(1)
}
console.log(`\nBundle ID ${BUNDLE_IDENTIFIER} → ${bundle.id}`)

// The relationship endpoint rejects a `limit` param, unlike most ASC lists.
const caps = await asc('GET', `/v1/bundleIds/${bundle.id}/bundleIdCapabilities`)
if (!caps.ok) {
  console.error('  could not read capabilities —', explain(caps))
} else {
  const types = (caps.body.data || []).map((c) => c.attributes?.capabilityType)
  console.log('  capabilities:', types.length ? types.join(', ') : '(none)')

  if (types.includes('APPLE_PAY')) {
    console.log('\n✓ APPLE_PAY capability already enabled')
    // Enabling the capability is NOT the whole job: the App ID must also be
    // ASSOCIATED with the merchant id, or Apple issues a provisioning profile
    // that omits Apple Pay and the archive fails with "Provisioning Profile does
    // not support the Apple Pay capability". The App Store Connect API does not
    // model that association (bundleIdCapabilities exposes no merchantIds
    // relationship and forbids GET_INSTANCE), so it cannot be checked or set here.
    console.log(`  ⚠ Cannot verify that ${MERCHANT_IDENTIFIER} is ASSOCIATED with this App ID.`)
    console.log('    The ASC API does not expose that link. Set it with either:')
    console.log(`      fastlane produce associate_merchant -a ${BUNDLE_IDENTIFIER} \\`)
    console.log(`        ${MERCHANT_IDENTIFIER} -b <team id> -u <apple id>   # prompts for 2FA`)
    console.log('    or Developer portal → Identifiers → the App ID → Apple Pay → Edit.')
  } else if (!APPLY) {
    console.log('\n→ would enable the APPLE_PAY capability on this bundle id')
  } else {
    const enabled = await asc('POST', '/v1/bundleIdCapabilities', {
      data: {
        type: 'bundleIdCapabilities',
        attributes: { capabilityType: 'APPLE_PAY' },
        relationships: { bundleId: { data: { type: 'bundleIds', id: bundle.id } } },
      },
    })
    if (enabled.ok) {
      console.log('\n✓ enabled APPLE_PAY on', BUNDLE_IDENTIFIER)
    } else {
      console.error('\n✗ enabling APPLE_PAY failed —', explain(enabled))
      process.exitCode = 1
    }
  }
}

if (!CSR_PATH) {
  console.log(`
── The certificate ──
Only Stripe can produce the CSR: it keeps the private key that decrypts Apple
Pay tokens, and Stripe's docs explicitly reject a self-generated one. So the two
ends stay in the Dashboard, but this script covers the Apple middle.

  1. https://dashboard.stripe.com/settings/ios_certificates → "Add new
     application" → enter ${MERCHANT_IDENTIFIER} → download the CSR.
  2. node scripts/asc-setup-apple-pay.mjs --csr <that file> --apply
     (uploads it to Apple, writes the issued .cer beside the CSR)
  3. Upload that .cer back to Stripe in step 1's flow.

Then rebuild the app natively (the entitlement changes the binary, so an OTA
update will NOT pick this up):

  cd mobile && eas build --local --platform ios --profile production
`)
}
