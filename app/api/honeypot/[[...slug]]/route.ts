import { NextResponse, type NextRequest } from 'next/server'

/**
 * Honeypot decoy responder.
 *
 * Attackers and automated scanners constantly probe well-known paths that a
 * Next.js app never serves (`/.env`, `/wp-login.php`, `/.git/config`,
 * `/phpmyadmin`, …). Those paths are rewritten to this handler in
 * `next.config.js`. Any request that reaches here is, by definition, someone
 * poking at things they shouldn't — so we:
 *
 *   1. log a structured record (IP, UA, path, method, any submitted creds) via
 *      console.warn, which shows up in Vercel function logs / any log drain, and
 *   2. return believable-but-fake content so the scanner wastes its time and
 *      thinks it found something real.
 *
 * Everything here is self-contained (no DB, no extra deps). To escalate this
 * into full alerting, forward the `[honeypot]` log line to Slack/Sentry, or
 * write it to Firestore using the app's existing admin SDK — see HONEYPOT.md.
 *
 * IMPORTANT: no attacker-controlled input is ever reflected into an HTML
 * response, so this cannot itself become an XSS vector.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Every decoy response uses HTTP 404 — the same status these paths would
 * return if the honeypot did not exist.
 *
 * Why: the honeypot's actual security value is the `[honeypot]` log line, and
 * that fires on every hit regardless of the status code we return. Serving the
 * decoys with 200 bought a marginal amount of extra attacker time-wasting, but
 * cost us something real — every external security scanner reported
 * `/.env`, `/.git/HEAD`, `/.aws/credentials`, `/server-status` and the `*.sql`
 * paths as CRITICAL "exposed sensitive path" findings, because the only thing
 * a scanner checks is "did this path return 200?". For a live payments app
 * that ships security-scan output to partners and processors, a permanent
 * shelf of false-positive criticals is worse than useless: it buries real
 * findings and invites account review.
 *
 * A 404 keeps everything that mattered — the log line, the decoy body (which
 * a human or a body-parsing bot still reads and still wastes time on) — while
 * making automated scanners correctly conclude there is nothing here.
 *
 * Do not change this back to 200 without a plan for the scanner noise.
 */
const DECOY_STATUS = 404

type DecoyKind =
  | 'wordpress'
  | 'dotenv'
  | 'git'
  | 'phpmyadmin'
  | 'aws'
  | 'server-status'
  | 'backup'
  | 'php-config'
  | 'generic'

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}

function detectKind(path: string): DecoyKind {
  const p = path.toLowerCase()
  if (p.includes('wp-') || p.includes('xmlrpc')) return 'wordpress'
  if (p.includes('.env')) return 'dotenv'
  if (p.includes('.git')) return 'git'
  if (p.includes('phpmyadmin') || p.includes('/pma') || p.includes('adminer'))
    return 'phpmyadmin'
  if (p.includes('aws') || p.includes('credentials')) return 'aws'
  if (p.includes('server-status')) return 'server-status'
  if (p.endsWith('.sql') || p.endsWith('.zip') || p.endsWith('.bak'))
    return 'backup'
  if (p.endsWith('.php')) return 'php-config'
  return 'generic'
}

/** Fake WordPress login page. Contains no reflected input. */
const WP_LOGIN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Log In &lsaquo; WordPress</title>
<style>
 body{margin:0;background:#f0f0f1;font:14px -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#3c434a}
 .wrap{max-width:320px;margin:8% auto 0;padding:0 24px}
 .logo{text-align:center;margin-bottom:25px;font-size:20px;font-weight:600;color:#1d2327}
 form{background:#fff;border:1px solid #c3c4c7;box-shadow:0 1px 3px rgba(0,0,0,.04);padding:26px 24px}
 label{display:block;margin:0 0 6px;font-weight:600}
 input[type=text],input[type=password]{width:100%;box-sizing:border-box;padding:7px 8px;font-size:16px;border:1px solid #8c8f94;border-radius:3px;margin-bottom:16px}
 button{background:#2271b1;border:1px solid #2271b1;color:#fff;padding:6px 14px;font-size:13px;border-radius:3px;cursor:pointer}
</style></head>
<body><div class="wrap"><div class="logo">WordPress</div>
<form method="post" autocomplete="off">
 <label for="user_login">Username or Email Address</label>
 <input type="text" name="log" id="user_login" autocomplete="off" />
 <label for="user_pass">Password</label>
 <input type="password" name="pwd" id="user_pass" autocomplete="off" />
 <p><label><input type="checkbox" name="rememberme" value="forever" /> Remember Me</label></p>
 <p style="text-align:right"><button type="submit" name="wp-submit">Log In</button></p>
</form></div></body></html>`

const PHPMYADMIN_HTML = `<!doctype html>
<html><head><title>phpMyAdmin</title></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:40px">
<h1 style="color:#c00">phpMyAdmin</h1>
<p>Cannot connect: invalid settings. Connection for controluser as defined in your configuration failed.</p>
</body></html>`

const DOTENV_BODY = [
  'APP_ENV=production',
  'APP_DEBUG=false',
  'DB_CONNECTION=mysql',
  'DB_HOST=127.0.0.1',
  'DB_DATABASE=app_production',
  'DB_USERNAME=app',
  'DB_PASSWORD=Zx8s-honeypot-not-a-real-secret',
  'JWT_SECRET=this_value_is_a_decoy',
  '',
].join('\n')

const GIT_CONFIG_BODY = [
  '[core]',
  '\trepositoryformatversion = 0',
  '\tfilemode = true',
  '\tbare = false',
  '[remote "origin"]',
  '\turl = https://example.com/app.git',
  '',
].join('\n')

const AWS_BODY = [
  '[default]',
  'aws_access_key_id = AKIAIOSFODNN7EXAMPLE',
  'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  '',
].join('\n')

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> }
): Promise<Response> {
  const { slug } = await ctx.params
  const path = '/' + (slug ?? []).join('/')
  const kind = detectKind(path)

  // Capture submitted credentials (WordPress-style form or JSON) for the log.
  let captured: { username?: string; passwordLength?: number } = {}
  if (req.method === 'POST') {
    try {
      const ct = req.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) {
        const j = (await req.json()) as Record<string, unknown>
        const u = j.log ?? j.username ?? j.user ?? j.email
        const p = j.pwd ?? j.password ?? j.pass
        if (typeof u === 'string') captured.username = u.slice(0, 200)
        if (typeof p === 'string') captured.passwordLength = p.length
      } else {
        const form = await req.formData()
        const u = form.get('log') ?? form.get('username') ?? form.get('email')
        const p = form.get('pwd') ?? form.get('password')
        if (typeof u === 'string') captured.username = u.slice(0, 200)
        if (typeof p === 'string') captured.passwordLength = p.length
      }
    } catch {
      /* ignore malformed bodies */
    }
  }

  // Structured, greppable log line. Shows up in Vercel function logs.
  console.warn(
    '[honeypot] ' +
      JSON.stringify({
        ip: clientIp(req),
        method: req.method,
        path,
        kind,
        userAgent: req.headers.get('user-agent')?.slice(0, 400) ?? null,
        referer: req.headers.get('referer')?.slice(0, 200) ?? null,
        host: req.headers.get('host') ?? null,
        ...(captured.username !== undefined ? { username: captured.username } : {}),
        ...(captured.passwordLength !== undefined
          ? { passwordLength: captured.passwordLength }
          : {}),
      })
  )

  const html = (body: string, status = DECOY_STATUS): Response =>
    new NextResponse(body, {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  const text = (body: string, status = DECOY_STATUS): Response =>
    new NextResponse(body, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })

  switch (kind) {
    case 'wordpress':
      return html(WP_LOGIN_HTML)
    case 'phpmyadmin':
      return html(PHPMYADMIN_HTML)
    case 'dotenv':
      return text(DOTENV_BODY)
    case 'git':
      return text(GIT_CONFIG_BODY)
    case 'aws':
      return text(AWS_BODY)
    case 'server-status':
      return text('Apache Server Status for localhost\nServer uptime: unknown\n')
    case 'backup':
      return new NextResponse('-- SQL dump\n-- (empty)\n', {
        status: DECOY_STATUS,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename=backup.sql',
          'Cache-Control': 'no-store',
        },
      })
    case 'php-config':
      // PHP source is never returned by a real server; mimic a blank page.
      return html('')
    case 'generic':
    default:
      return text('Not Found')
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle
export const HEAD = handle
export const OPTIONS = handle
