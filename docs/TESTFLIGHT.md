# Ship Tikèm mobile to TestFlight

Run these from `mobile/`. EAS is already logged in as **edlight** (`eas whoami` to confirm).

## Prerequisites (one-time)
- **Apple Developer Program** membership ($99/yr) enrolled for your team.
- Bundle ID `co.tikem.mobile` — EAS can auto-register it during the first build (say "yes" when prompted), or create it in the Apple Developer portal.
- `eas.json` is already set up (development / preview / production profiles).

## Step 1 — Get env vars onto the build  ⚠️ REQUIRED
`.env` is gitignored, so it is **not** uploaded to EAS build servers. Push the public
`EXPO_PUBLIC_*` values to EAS environment variables (one time; they persist):

```bash
cd mobile
eas env:push production --path .env
# (repeat for preview if you'll build that profile)
eas env:push preview --path .env
```

These are all `EXPO_PUBLIC_*` client keys (Firebase web config + the API URL) — public
by design (they ship in the app bundle), so this is safe. Verify:

```bash
eas env:list production
```

You should see EXPO_PUBLIC_FIREBASE_* and EXPO_PUBLIC_API_URL.

> If `eas env:push` isn't available on your CLI version, instead add the same
> `EXPO_PUBLIC_*` keys under `build.production.env` (and `build.preview.env`) in `eas.json`.

## Step 2 — Build the iOS app
```bash
eas build --platform ios --profile production
```
- First run prompts for **Apple login** and to set up **signing credentials** — let EAS
  manage them (recommended). This is the step only you can do (your Apple account).
- Build runs on EAS servers (~15–25 min). Stripe + Apple Sign-In compile fine there
  (the local Xcode issue does not apply).

## Step 3 — Submit to TestFlight
```bash
eas submit --platform ios --profile production --latest
```
- Prompts for App Store Connect auth. Easiest is an **App Store Connect API key**
  (App Store Connect → Users and Access → Integrations → create key), or Apple ID login.
- On first submit it creates the app record in App Store Connect if missing.

## Step 4 — In App Store Connect
- **TestFlight** tab → the build appears after processing (~10–15 min).
- Complete **Test Information** (what to test, contact email) — required.
- Answer the **export-compliance** question (standard HTTPS = usually "no" to custom crypto).
- Add internal testers (your team) → they install via the TestFlight app.
- For external testers, a short **Beta App Review** is required first.

## Also set before public launch (not blocking TestFlight)
- **Privacy policy URL** in App Store Connect (page is live: `/legal/privacy`).
- **App privacy** data-collection questionnaire.
- App icon/screenshots/description for the store listing.
- Point the production domain and switch `EXPO_PUBLIC_API_URL` if moving off
  `eventhaiti.vercel.app`.

## Known / expected
- **MonCash instant payouts (prefunding)** won't transact until your Digicel credentials
  go live — the standard payout path works meanwhile. Not a TestFlight blocker.
- Android: same flow with `--platform android` once you set up a Play Console account.
