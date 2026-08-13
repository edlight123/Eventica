/**
 * Guest identity: the retrieval token and the contact rules.
 *
 * The token is the ONLY thing standing between a stranger and a guest's ticket, so the
 * properties asserted here are load-bearing: it must be unguessable, it must not be
 * accepted with a bad or absent signature, and it must be re-derivable from the stored
 * order key (which is how a webhook that runs minutes later can still put the buyer's
 * own link in their email without the system ever storing that link).
 *
 * @jest-environment node
 */

// No Firestore in these tests — every function under test is pure.
jest.mock('@/lib/firebase/admin', () => ({ adminDb: {} }))

import {
  GUEST_ID_PREFIX,
  guestTicketUrl,
  guestTokenFor,
  isGuestId,
  isValidPhone,
  mintGuestOrderKey,
  normalizeEmail,
  normalizePhone,
  validateGuestContact,
  verifyGuestToken,
} from '@/lib/guest/identity'

describe('retrieval token', () => {
  const originalSecret = process.env.GUEST_TICKET_LINK_SECRET

  beforeAll(() => {
    process.env.GUEST_TICKET_LINK_SECRET = 'test-secret-for-guest-links'
  })
  afterAll(() => {
    process.env.GUEST_TICKET_LINK_SECRET = originalSecret
  })

  it('mints an unguessable order key', () => {
    const a = mintGuestOrderKey()
    const b = mintGuestOrderKey()
    expect(a).toMatch(/^[a-f0-9]{48}$/) // 192 bits
    expect(a).not.toBe(b)
  })

  it('round-trips: a signed token verifies back to its order key', () => {
    const key = mintGuestOrderKey()
    const token = guestTokenFor(key)
    expect(token.startsWith(`${key}.`)).toBe(true)
    expect(verifyGuestToken(token)).toBe(key)
  })

  it('is DERIVABLE, so fulfillment can rebuild the buyer link later', () => {
    const key = mintGuestOrderKey()
    expect(guestTokenFor(key)).toBe(guestTokenFor(key))
  })

  it('rejects the order key on its own — a leaked document id is not a link', () => {
    const key = mintGuestOrderKey()
    expect(verifyGuestToken(key)).toBeNull()
  })

  it('rejects a forged or edited signature', () => {
    const key = mintGuestOrderKey()
    const token = guestTokenFor(key)
    const [body, sig] = token.split('.')

    expect(verifyGuestToken(`${body}.${'a'.repeat(sig.length)}`)).toBeNull()
    expect(verifyGuestToken(`${mintGuestOrderKey()}.${sig}`)).toBeNull()
    expect(verifyGuestToken(`${body}.${sig}extra`)).toBeNull()
  })

  it('rejects junk without throwing', () => {
    for (const junk of ['', '   ', null, undefined, 42, {}, '../../etc/passwd', 'a.b.c', 'x'.repeat(500)]) {
      expect(verifyGuestToken(junk as any)).toBeNull()
    }
  })

  it('will not accept a token signed with a different secret', () => {
    const key = mintGuestOrderKey()
    const token = guestTokenFor(key)
    process.env.GUEST_TICKET_LINK_SECRET = 'a-different-secret'
    expect(verifyGuestToken(token)).toBeNull()
    process.env.GUEST_TICKET_LINK_SECRET = 'test-secret-for-guest-links'
  })

  it('builds a URL that carries the token, not the guest id', () => {
    const token = guestTokenFor(mintGuestOrderKey())
    const url = guestTicketUrl(token)
    expect(url).toContain('/tickets/guest/')
    expect(url).toContain(encodeURIComponent(token).slice(0, 20))
  })
})

describe('guest ids', () => {
  it('are distinguishable from Firebase uids', () => {
    expect(isGuestId(`${GUEST_ID_PREFIX}abc`)).toBe(true)
    expect(isGuestId('KJh2k3jhKJH2kjh3')).toBe(false)
    expect(isGuestId(null)).toBe(false)
    expect(isGuestId(undefined)).toBe(false)
  })
})

describe('phone normalization — a first-class identifier in Haiti', () => {
  it('expands a locally-typed 8-digit Haitian number to E.164', () => {
    expect(normalizePhone('3412 3456')).toBe('+50934123456')
    expect(normalizePhone('34-12-34-56')).toBe('+50934123456')
    expect(normalizePhone('50934123456')).toBe('+50934123456')
  })

  it('respects a number that already names its country', () => {
    expect(normalizePhone('+1 555 010 0000')).toBe('+15550100000')
    expect(normalizePhone('+509 3412 3456')).toBe('+50934123456')
  })

  it('handles the US/CA default when that is the event country', () => {
    expect(normalizePhone('555 010 0000', 'US')).toBe('+15550100000')
    expect(normalizePhone('1 555 010 0000', 'CA')).toBe('+15550100000')
  })

  it('returns empty for nothing at all', () => {
    expect(normalizePhone('')).toBe('')
    expect(normalizePhone(null)).toBe('')
    expect(normalizePhone('   ')).toBe('')
  })

  it('only calls a number sendable when it looks like E.164', () => {
    expect(isValidPhone('+50934123456')).toBe(true)
    expect(isValidPhone('+1')).toBe(false)
    expect(isValidPhone('50934123456')).toBe(false)
  })
})

describe('contact validation', () => {
  it('lowercases and trims the email — it is the dedup and support key', () => {
    expect(normalizeEmail('  Marie@Example.COM ')).toBe('marie@example.com')
  })

  it('accepts a complete contact', () => {
    const result = validateGuestContact({ name: ' Marie ', email: 'M@x.co', phone: '34123456' })
    expect(result).toEqual({
      ok: true,
      contact: { name: 'Marie', email: 'm@x.co', phone: '+50934123456' },
    })
  })

  it('refuses a missing name or a malformed email with a machine-readable code', () => {
    expect(validateGuestContact({ email: 'a@b.co' })).toMatchObject({ ok: false, code: 'guest_name_required' })
    expect(validateGuestContact({ name: 'A', email: 'nope' })).toMatchObject({
      ok: false,
      code: 'guest_email_invalid',
    })
    expect(validateGuestContact(null)).toMatchObject({ ok: false, code: 'guest_name_required' })
  })

  it('requires a phone when the event country makes it the real channel', () => {
    expect(validateGuestContact({ name: 'A', email: 'a@b.co' }, { requirePhone: true })).toMatchObject({
      ok: false,
      code: 'guest_phone_required',
    })
    expect(
      validateGuestContact({ name: 'A', email: 'a@b.co', phone: '34123456' }, { requirePhone: true })
    ).toMatchObject({ ok: true })
  })

  it('refuses a phone we could never text rather than accepting it silently', () => {
    expect(validateGuestContact({ name: 'A', email: 'a@b.co', phone: '12' })).toMatchObject({
      ok: false,
      code: 'guest_phone_invalid',
    })
  })

  it('caps a pathologically long name instead of storing it', () => {
    const result = validateGuestContact({ name: 'x'.repeat(500), email: 'a@b.co' })
    expect(result.ok).toBe(true)
    expect(result.ok && result.contact.name.length).toBe(120)
  })
})
