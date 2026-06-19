import { NextResponse } from 'next/server'

/**
 * Android Asset Links (Digital Asset Links)
 *
 * Served at https://tikem.co/.well-known/assetlinks.json via a rewrite in
 * next.config.js. Enables Android App Links so https://tikem.co/... opens the
 * Tikèm app (package co.tikem.mobile) and removes the "open with" chooser.
 *
 * The signing-certificate SHA-256 fingerprint(s) are read from
 * ANDROID_SHA256_CERT_FINGERPRINTS (comma-separated) so no secrets are
 * committed. Get them from `eas credentials` (production keystore) or the
 * Play Console (App signing). Until set, an empty array is served.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ANDROID_PACKAGE = 'co.tikem.mobile'

export async function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const body = fingerprints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: ANDROID_PACKAGE,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : []

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
