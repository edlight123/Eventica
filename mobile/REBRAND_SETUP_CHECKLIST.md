# Tikèm Rebrand — Setup Checklist

Tracks the external (dashboard/DNS) work needed after the code rebrand to
**Tikèm / tikem.co / co.tikem.mobile**. Items marked ✅ are already handled in
the repo; ⬜ items must be done by hand in the relevant console (they can't be
scripted from this environment).

> Brand: **Tikèm** (display) / `tikem` (ASCII) · Domain: **tikem.co** · Mobile
> bundle/package: **co.tikem.mobile** · Apple Pass type: **pass.co.tikem.ticket**
> · Firebase project (unchanged live infra): **eventhaiti-c5e1f**

---

## 1. Domain & DNS
- ⬜ Register / point **tikem.co** and **www.tikem.co** at the host (Vercel).
- ⬜ Vercel → Project → Settings → **Domains**: add `tikem.co` (+ `www`), set primary.
- ⬜ Verify HTTPS cert issued for both.

## 2. Email (Resend)
- ⬜ Resend → **Domains** → add `tikem.co`, add the SPF / DKIM / DMARC DNS records, verify.
- ⬜ Create mailboxes / aliases: `noreply@`, `support@`, `legal@`, `privacy@`,
  `dpo@`, `refunds@`, `admin@` `tikem.co`.
- ✅ App "From" default is `Tikem <noreply@tikem.co>` (lib/email.ts). Optionally
  set `EMAIL_FROM="Tikèm <noreply@tikem.co>"`.

## 3. Production environment variables
Set in Vercel (Project → Settings → Environment Variables):
- ⬜ `NEXT_PUBLIC_APP_URL=https://tikem.co`
- ⬜ `ADMIN_EMAILS` / `ADMIN_EMAIL` → real `@tikem.co` address(es)
- ⬜ `EMAIL_FROM=Tikèm <noreply@tikem.co>` (optional; default already tikem.co)
- ⬜ `APPLE_TEAM_ID` → activates `/.well-known/apple-app-site-association`
- ⬜ `ANDROID_SHA256_CERT_FINGERPRINTS` → activates `/.well-known/assetlinks.json`
- ✅ `.env.example` documents all of the above.

## 4. Firebase Console (project stays `eventhaiti-c5e1f`)
- ⬜ Authentication → Settings → **Authorized domains**: add `tikem.co`, `www.tikem.co`.
- ⬜ (If using hosted email links / action URLs) update the action URL domain.
- ℹ️ No `google-services.json` / `GoogleService-Info.plist` re-download needed —
  the mobile app uses the Firebase **JS SDK** via `EXPO_PUBLIC_FIREBASE_*` env
  vars (mobile/config/firebase.ts), not native config files.

## 5. Google Sign-In / OAuth (Google Cloud Console)
The OAuth clients were tied to the old bundle ID, so new ones are required:
- ⬜ Create **iOS** OAuth client for `co.tikem.mobile`.
- ⬜ Create **Android** OAuth client for `co.tikem.mobile` (+ EAS keystore SHA-1).
- ⬜ Update the web client's Authorized JavaScript origins / redirect URIs to `https://tikem.co`.
- ⬜ Put the new client IDs into the app's `EXPO_PUBLIC_*` env (and web env if used).

## 6. Apple Developer (only if shipping iOS / Wallet / Sign in with Apple)
- ⬜ Register App ID **co.tikem.mobile** with the Associated Domains capability.
- ⬜ Add Associated Domain `applinks:tikem.co` (✅ already declared in mobile/app.json).
- ⬜ Create Wallet **Pass Type ID** `pass.co.tikem.ticket`; set `APPLE_TEAM_ID` + `APPLE_PASS_TYPE_ID`.
- ⬜ If using Sign in with Apple, enable it for the new App ID.

## 7. App Store Connect & Google Play
- ⬜ Because the bundle ID/package is permanent, **co.tikem.mobile is a new app
  listing** — you can't rename an existing app's identifier. Create fresh
  listings (name "Tikèm").
- ⬜ Upload new icons/screenshots branded Tikèm.

## 8. Expo / EAS
- ⬜ Run **`eas init`** in `mobile/` — assigns a real EAS project UUID and adds
  `owner` + `extra.eas.projectId` to app.json. (The invalid placeholder was
  removed so `eas build` won't fail; ✅.)
- ⬜ `eas credentials` → generate/inspect the **production Android keystore**;
  copy its **SHA-256** into `ANDROID_SHA256_CERT_FINGERPRINTS` (prod env) so
  `/.well-known/assetlinks.json` activates.
- ⬜ Set mobile env: `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_URL = https://tikem.co`
  and `EXPO_PUBLIC_FIREBASE_*`.

## 9. Deep links / Universal Links (in-repo, env-activated)
- ✅ `app/api/well-known/aasa/route.ts` serves the iOS AASA (env: `APPLE_TEAM_ID`).
- ✅ `app/api/well-known/assetlinks/route.ts` serves Android Asset Links
  (env: `ANDROID_SHA256_CERT_FINGERPRINTS`).
- ✅ `next.config.js` rewrites `/.well-known/apple-app-site-association` and
  `/.well-known/assetlinks.json` to those routes.
- ✅ `mobile/app.json` declares `ios.associatedDomains` + `android.intentFilters`
  for tikem.co (`/events`, `/tickets`, `/invite`, `/notifications`).
- ⬜ After deploy, verify:
  - `curl https://tikem.co/.well-known/apple-app-site-association` returns your
    `TEAMID.co.tikem.mobile` appID.
  - `curl https://tikem.co/.well-known/assetlinks.json` returns your package +
    SHA-256.
  - Apple: https://app-site-association.cdn-apple.com/a/v1/tikem.co
  - Android: `https://developers.google.com/digital-asset-links/tools/generator`

## 10. Payments & 3rd-party webhooks/redirects
- ⬜ **Stripe**: update Connect/branding, webhook endpoint → `https://tikem.co/api/webhooks/stripe`,
  and account return/refresh URLs.
- ⬜ **MonCash / SogePay**: update return/callback URLs to `https://tikem.co/...`.
- ⬜ Update any social handles linked in emails (`/tikem` on IG/FB/Twitter).

---

### Quick verification after going live
```bash
curl -s https://tikem.co/.well-known/apple-app-site-association | jq
curl -s https://tikem.co/.well-known/assetlinks.json | jq
```
