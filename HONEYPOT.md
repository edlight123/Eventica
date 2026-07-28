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

## Decoys return HTTP 404

Every decoy response carries a **404** status — the same status these paths
would return if the honeypot did not exist. The fake body is still served.

This matters because the honeypot's real value is the `[honeypot]` log line,
and that fires on every hit **regardless of the status code**. Serving decoys
with `200` bought a marginal amount of extra attacker time-wasting but cost
something concrete: every external security scanner reported `/.env`,
`/.git/HEAD`, `/.aws/credentials`, `/server-status` and the `*.sql` paths as
CRITICAL *"exposed sensitive path"* findings, because the only thing a scanner
checks is *did this path return 200?*

For a live payments app whose scan output gets read by partners and payment
processors, a permanent shelf of false-positive criticals is worse than
useless — it buries real findings and invites account review.

With a 404 we keep both halves of the original design:

- **The signal** — the structured log line, unchanged.
- **The deception** — a human or a body-parsing bot still reads the fake
  `.env` and still wastes time on it. Only status-code-driven scanners (i.e.
  all of them) correctly conclude there is nothing here.

`__tests__/unit/honeypot-decoy.test.ts` asserts this for every path in
`HONEYPOT_DECOY_PATHS`, so adding a new decoy path cannot silently reintroduce
a `200`. Don't change `DECOY_STATUS` back without a plan for the scanner noise.

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
curl -i http://localhost:3000/.env            # 404 + fake env file
curl -i http://localhost:3000/wp-login.php    # 404 + fake WordPress login
curl -i -X POST http://localhost:3000/wp-login.php \
  --data 'log=admin&pwd=hunter2'              # captured in the logs
```

Each request prints a `[honeypot] …` line in the dev server console. Note the
`404` in the status line — that is expected, see above.

Unit tests:

```bash
npx jest __tests__/unit/honeypot-decoy.test.ts
```
