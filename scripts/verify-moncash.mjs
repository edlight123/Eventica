/**
 * MonCash credential verification harness.
 *
 * Tests BOTH supported MonCash integration paths against the live Digicel gateway,
 * for whatever credentials are in your environment, and prints a clear verdict.
 * It never prints secrets — only statuses, sizes, and non-sensitive response shape.
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-moncash.mjs
 *   node --env-file=.env.vercel.production scripts/verify-moncash.mjs
 *
 * Optional: set MONCASH_VERIFY_HOSTS=production (or sandbox) to limit hosts.
 *
 * What "working" looks like:
 *   - REST flow:   OAuth returns 200 + access_token, CreatePayment returns 200 + payment_token.
 *   - Button flow: /Checkout renders a real payment page (NOT "System Error"/"Session expired").
 */
import crypto from 'crypto'

const HOSTS = (() => {
  const only = (process.env.MONCASH_VERIFY_HOSTS || '').toLowerCase().trim()
  const all = { sandbox: 'https://sandbox.moncashbutton.digicelgroup.com', production: 'https://moncashbutton.digicelgroup.com' }
  if (only === 'production') return { production: all.production }
  if (only === 'sandbox') return { sandbox: all.sandbox }
  return all
})()

const ERROR_PAGE_RE = /broken|system error|session expired|could not|erreur|not found|unauthorized|404/i

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------- REST "Payment Gateway" flow (client_id/secret, no RSA) ----------
async function testRest(host) {
  const clientId = (process.env.MONCASH_CLIENT_ID || '').trim()
  const secret = (process.env.MONCASH_SECRET_KEY || '').trim()
  if (!clientId || !secret) return { skipped: 'MONCASH_CLIENT_ID / MONCASH_SECRET_KEY not set' }

  const creds = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const variants = [
    { auth: 'basic', scope: 'read,write' },
    { auth: 'basic', scope: 'read write' },
    { auth: 'body', scope: 'read,write' },
    { auth: 'body', scope: 'read write' },
  ]

  let token = null
  let tokenStatus = null
  for (const v of variants) {
    const p = new URLSearchParams({ grant_type: 'client_credentials' })
    if (v.scope) p.set('scope', v.scope)
    if (v.auth === 'body') { p.set('client_id', clientId); p.set('client_secret', secret) }
    const r = await fetch(`${host}/Api/oauth/token`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', ...(v.auth === 'basic' ? { Authorization: `Basic ${creds}` } : {}) },
      body: p.toString(),
    })
    tokenStatus = r.status
    const j = await r.json().catch(() => null)
    if (r.ok && j?.access_token) { token = j.access_token; break }
  }

  if (!token) return { oauth: { ok: false, lastStatus: tokenStatus }, createPayment: null }

  const orderId = `${Date.now() % 1_000_000_000}`
  const r2 = await fetch(`${host}/Api/v1/CreatePayment`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount: 10, orderId }),
  })
  const j2 = await r2.json().catch(() => null)
  const payToken = j2?.payment_token?.token
  return {
    oauth: { ok: true, status: 200 },
    createPayment: { ok: r2.ok && !!payToken, status: r2.status, hasPaymentToken: !!payToken, mode: j2?.mode },
  }
}

// ---------- Button / form-POST "Hosted Page" flow (business key + RSA public key) ----------
function parsePub(v) {
  const n = v.replace(/\\n/g, '\n').trim()
  if (n.includes('BEGIN')) return crypto.createPublicKey(n)
  const der = Buffer.from(n.replace(/\s+/g, ''), 'base64')
  try { return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' }) }
  catch { return crypto.createPublicKey({ key: der, format: 'der', type: 'pkcs1' }) }
}

async function testButton(host) {
  const bk = (process.env.MONCASH_BUTTON_FORM_BUSINESS_KEY || process.env.MONCASH_BUTTON_BUSINESS_KEY || '').trim()
  const secretKey = (process.env.MONCASH_BUTTON_FORM_SECRET_API_KEY || process.env.MONCASH_BUTTON_SECRET_API_KEY || '').trim()
  if (!bk || !secretKey) return { skipped: 'Button business key / secret api key not set' }

  let keyObj
  try { keyObj = parsePub(secretKey) } catch (e) { return { keyError: e.message } }
  const bits = keyObj.asymmetricKeyDetails?.modulusLength
  const keyPem = keyObj.export({ format: 'pem', type: 'spki' })
  const k = Math.ceil(bits / 8)
  const keyWarn = bits < 1024 ? `WARNING: ${bits}-bit key is far too small for a real MonCash key (expect 1024-2048).` : null

  function enc(value, padding, encoding) {
    let buf = Buffer.from(value, 'utf8')
    const opts = { key: keyPem }
    if (padding === 'none') {
      if (buf.length < k) { const o = Buffer.alloc(k); buf.copy(o, k - buf.length); buf = o }
      opts.padding = crypto.constants.RSA_NO_PADDING
    } else { opts.padding = crypto.constants.RSA_PKCS1_PADDING }
    const out = crypto.publicEncrypt(opts, buf)
    return encoding === 'base64' ? out.toString('base64') : out.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  const attempts = []
  let anyOk = false
  for (const padding of ['none', 'pkcs1']) {
    for (const encoding of ['base64url', 'base64']) {
      const orderId = `${Date.now() % 1_000_000_000}`
      let amountC, orderC
      try { amountC = enc('10', padding, encoding); orderC = enc(orderId, padding, encoding) }
      catch (e) { attempts.push({ padding, encoding, encryptError: e.message.slice(0, 50) }); continue }
      const r = await fetch(`${host}/Moncash-middleware/Checkout/${encodeURIComponent(bk)}`, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
        body: new URLSearchParams({ amount: amountC, orderId: orderC }).toString(),
      })
      const vis = visibleText(await r.text().catch(() => ''))
      const isError = ERROR_PAGE_RE.test(vis)
      if (!isError) anyOk = true
      attempts.push({ padding, encoding, status: r.status, ok: !isError, page: vis.slice(0, 80) })
    }
  }
  return { keyBits: bits, keyWarn, anyOk, attempts }
}

// ---------- Run ----------
console.log('MonCash verification —', new Date().toISOString())
for (const [name, host] of Object.entries(HOSTS)) {
  console.log(`\n================ ${name.toUpperCase()} (${host}) ================`)
  console.log('\n[REST gateway flow]')
  console.log(JSON.stringify(await testRest(host), null, 2))
  console.log('\n[Button form-POST flow]')
  console.log(JSON.stringify(await testButton(host), null, 2))
}
console.log('\nDone. A flow is usable only if its ok/hasPaymentToken/anyOk is true with no error page.')
