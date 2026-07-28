# Honeypot

A lightweight, self-contained honeypot that catches automated scanners and
attackers probing for paths this app never serves (`/.env`, `/wp-login.php`,
`/.git/config`, `/phpmyadmin`, …). Any hit is almost certainly malicious, which
makes it a very clean signal.

## How it works

1. **Rewrites** (`next.config.js`, `HONEYPOT_DECOY_PATHS`) route a curated list
   of well-known probe paths to the decoy responder. The list is deliberately
   chosen to **never overlap** with a real route — no `/admin`, no `/api/*`, no
   `/.well-known`, no `/manifest`.
2. **Decoy responder** (`app/api/honeypot/[[...slug]]/route.ts`) inspects the
   probed path, returns believable fake content (a fake WordPress login page,
   a fake `.env`, a fake `phpMyAdmin` page, etc.), and logs the hit.

The response is realistic enough to make a scanner think it found something,
which wastes its time and keeps it engaged instead of moving on to real
endpoints.

## What gets logged

Every hit emits a single structured `console.warn` line, visible in Vercel
function logs (and any log drain):

```
[honeypot] {"ip":"203.0.113.5","method":"POST","path":"/wp-login.php","kind":"wordpress","userAgent":"...","referer":null,"host":"jointikem.vercel.app","username":"admin","passwordLength":8}
```

Credentials submitted to the fake login forms are captured as
`username` + `passwordLength` (the password itself is **never** stored).

## Safety notes

- No new dependencies and no database — pure Next.js route handler + config.
- No attacker input is ever reflected into an HTML response, so the decoy
  pages cannot become an XSS vector.
- Existing routes are untouched; only the probe paths above are intercepted.

## Extending it

The `[honeypot]` log line is the integration point. To turn logs into alerts:

- **Slack / email:** post the record from the handler when `kind === 'wordpress'`
  or when credentials are captured.
- **Firestore:** write the record to a `honeypot_hits` collection using the
  app's existing Firebase Admin SDK (`lib/firebase-db/server`).
- **Auto-block:** feed repeat-offender IPs into an Upstash-backed blocklist
  (the app already uses `@upstash/ratelimit`) and reject them at the edge in
  `middleware.ts`.

## Testing locally

```bash
npm run dev
curl -i http://localhost:3000/.env           # fake env file
curl -i http://localhost:3000/wp-login.php    # fake WordPress login
curl -i -X POST http://localhost:3000/wp-login.php \
  --data 'log=admin&pwd=hunter2'              # captured in the logs
```

Each request prints a `[honeypot] …` line in the dev server console.
