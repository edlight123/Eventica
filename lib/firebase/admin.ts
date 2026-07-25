import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

let app: App | undefined

function getStorageBucketFromEnv(): string | undefined {
  const raw = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!raw) return undefined
  // Allow either "gs://bucket" or "bucket".
  return raw.startsWith('gs://') ? raw.slice('gs://'.length) : raw
}

/**
 * Parse the service-account JSON from an env var, tolerating the two most common
 * ways it gets corrupted when stored in a .env file or pulled from Vercel:
 *   1. The PEM `private_key` contains LITERAL newlines, which makes JSON.parse throw
 *      "Bad control character in string literal in JSON" — we escape control chars and retry.
 *   2. `private_key` uses escaped "\\n" sequences that must be turned back into real
 *      newlines before firebase-admin's cert() will accept the credential.
 */
function parseServiceAccount(raw: string): Record<string, any> {
  let parsed: Record<string, any>
  try {
    parsed = JSON.parse(raw)
  } catch {
    const sanitized = raw
      .replace(/\r/g, '')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
    parsed = JSON.parse(sanitized)
  }
  if (parsed && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
  }
  return parsed
}

// Don't initialize during build time (when VERCEL_ENV is not set or when in build phase)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

if (!isBuildTime && !getApps().length) {
  // Initialize with service account or Application Default Credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      const storageBucket = getStorageBucketFromEnv()
      app = initializeApp({
        credential: cert(serviceAccount),
        ...(storageBucket ? { storageBucket } : {}),
      })
    } catch (error) {
      console.error('Failed to parse Firebase service account:', error)
      app = undefined
    }
  } else {
    // For development - uses Application Default Credentials
    try {
      const storageBucket = getStorageBucketFromEnv()
      app = initializeApp({
        ...(storageBucket ? { storageBucket } : {}),
      })
    } catch (error) {
      console.warn('Firebase Admin not initialized (expected during build):', error)
      app = undefined
    }
  }
} else if (getApps().length > 0) {
  app = getApps()[0]
}

export const adminAuth = app ? getAuth(app) : ({} as any)

// ignoreUndefinedProperties: without it, any .set()/.update() carrying an
// `undefined` field value throws ("Cannot use 'undefined' as a Firestore
// value") and fails the whole write — e.g. the Haiti payout save passed
// bankDetails/allowInstantMoncash as undefined and every save errored with
// "Failed to save payout settings". Stripping undefined at the driver level
// is the standard, safe default and prevents this whole class of bug.
function initAdminDb() {
  if (!app) return {} as any
  const db = getFirestore(app)
  try {
    db.settings({ ignoreUndefinedProperties: true })
  } catch {
    // settings() throws if the instance was already used/configured; the app
    // only creates it here, so this is a no-op safety net.
  }
  return db
}
export const adminDb = initAdminDb()
export const adminStorage = app ? getStorage(app) : ({} as any)
export default app
