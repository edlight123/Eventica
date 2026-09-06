#!/usr/bin/env bash
#
# Interactively push production environment variables to Vercel.
#
# YOU run this and type the values — they go straight from your terminal into
# Vercel's encrypted store. Secret values are read silently (not echoed, not
# stored in this file or your shell history).
#
# Prereqs:
#   npm i -g vercel      # or: npx vercel@latest ...
#   vercel login
#   vercel link          # once, from the repo root, to link this project
#
# Usage:
#   ./scripts/set-vercel-env.sh
#
# After it finishes, redeploy so the new vars take effect:
#   vercel --prod        # or push to your production branch
#
set -euo pipefail

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Vercel CLI not found. Install it:  npm i -g vercel" >&2
  exit 1
fi

# Set a Production env var, overwriting any existing value. Reads the value from
# stdin so the secret never appears as a shell argument.
set_env() {
  local name="$1" value="$2"
  # Remove an existing value first (ignore failure if it doesn't exist yet),
  # then add fresh. --yes skips the interactive confirmation prompt.
  vercel env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$name" production >/dev/null
  echo "  ✓ $name set"
}

prompt_secret() {  # $1 = var name, $2 = human hint
  local val
  read -rsp "  $1 ($2): " val; echo
  if [ -n "$val" ]; then set_env "$1" "$val"; else echo "  – skipped $1 (empty)"; fi
}

ask() { read -rp "$1 [y/N] " a; [[ "$a" == "y" || "$a" == "Y" ]]; }

echo "This sets PRODUCTION environment variables on the linked Vercel project."
echo

# ── 1. Known, non-secret values — set automatically ─────────────────────────
# Public site URL (also fixes transactional-email links).
set_env "NEXT_PUBLIC_APP_URL" "https://tikem.co"
# Apple Team ID — retrieved from App Store Connect (bundle co.tikem.mobile).
# Activates iOS universal links once /.well-known/apple-app-site-association
# is redeployed. Not a secret (it ships in the public AASA file).
set_env "APPLE_TEAM_ID" "DCS7MLAM3X"
echo

# ── 2. Android deep links (optional) ────────────────────────────────────────
# The signing-cert SHA-256 is stored in EAS, not locally. To get it, run:
#     eas credentials --platform android
#   → select the production build profile → "Keystore" → it prints
#     "SHA256 Fingerprint: AA:BB:CC:...". Paste the whole colon-separated
#   value here (comma-separate multiple certs). Skip for now if unsure —
#   Android app links aren't needed until the app is on Google Play.
if ask "Set the Android SHA-256 fingerprint now?"; then
  prompt_secret "ANDROID_SHA256_CERT_FINGERPRINTS" "SHA-256 from 'eas credentials --platform android'"
fi
echo

# ── 3. MonCash go-live (secrets) ────────────────────────────────────────────
# Only when you have working Digicel keys. Values are typed silently.
if ask "Configure MonCash live payments now?"; then
  prompt_secret "MONCASH_CLIENT_ID"  "Digicel client id"
  prompt_secret "MONCASH_SECRET_KEY" "Digicel secret key"
  set_env "MONCASH_MODE" "production"   # lib/moncash.ts tests for exactly "production"; "live" silently selects SANDBOX
  set_env "MONCASH_MERCHANT_API_ENABLED" "true"
  echo "  ℹ After redeploy, verify with: node scripts/verify-moncash.mjs"
fi
echo

echo "✅ Done. Now redeploy production:  vercel --prod   (or push your prod branch)"
echo "   Verify iOS links: open https://tikem.co/.well-known/apple-app-site-association"
echo "   (should list DCS7MLAM3X.co.tikem.mobile once redeployed)"
