/**
 * `sendEmail` must never throw on a missing recipient.
 *
 * A user document without an `email` produced `to: undefined`, which Resend answers
 * with a 4xx. Fulfillment swallowed it, but the Stripe webhook did not — and a throw
 * there is reported to Stripe as a FAILED webhook, so Stripe retries an event whose
 * tickets were already issued, forever, for a problem no retry can fix.
 *
 * @jest-environment node
 */

import { sendEmail } from '@/lib/email'

describe('sendEmail recipient guard', () => {
  const originalKey = process.env.RESEND_API_KEY
  const originalFetch = global.fetch

  beforeEach(() => {
    // A real key, so a missing guard would genuinely reach the network.
    process.env.RESEND_API_KEY = 're_test_key'
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ id: 'msg_1' }) })) as any
  })

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey
    global.fetch = originalFetch
  })

  it.each([undefined, null, '', '   '])('returns a clear failure for %p instead of throwing', async (to) => {
    const result = await sendEmail({ to: to as any, subject: 'Your ticket', html: '<p>hi</p>' })

    expect(result).toEqual({
      success: false,
      error: 'No recipient email address',
      code: 'missing_recipient',
    })
    // Nothing was attempted — the address does not exist, so there is nothing to retry.
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('still sends, and trims, when there IS an address', async () => {
    const result = await sendEmail({ to: ' buyer@example.com ', subject: 'Your ticket', html: '<p>hi</p>' })

    expect(result).toMatchObject({ success: true, messageId: 'msg_1' })
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.to).toBe('buyer@example.com')
  })

  it('reports a provider failure as a result, not an exception', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({ message: 'Domain not verified' }),
    })) as any

    const result = await sendEmail({ to: 'buyer@example.com', subject: 's', html: 'h' })
    expect(result).toMatchObject({ success: false, code: 'provider_error', error: 'Domain not verified' })
  })
})
