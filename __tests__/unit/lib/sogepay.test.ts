/**
 * Unit tests for lib/sogepay.ts — the single, fail-closed integration point for Sogepay
 * callback verification and payload parsing. These are pure functions, so we can fully
 * exercise the security-critical signature check without any network/DB.
 */

import crypto from 'crypto'
import {
  isSogepayConfigured,
  isSogepayCallbackVerificationConfigured,
  verifySogepaySignature,
  parseSogepayCallbackPayload,
  isSogepayPaidAmountAcceptable,
} from '@/lib/sogepay'

const SECRET = 'test_sogepay_webhook_secret'

function sign(body: string, secret: string = SECRET): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

describe('sogepay config gating', () => {
  const original = { ...process.env }
  afterEach(() => {
    process.env = { ...original }
  })

  it('isSogepayConfigured reflects SOGEPAY_ENABLED', () => {
    delete process.env.SOGEPAY_ENABLED
    expect(isSogepayConfigured()).toBe(false)
    process.env.SOGEPAY_ENABLED = 'true'
    expect(isSogepayConfigured()).toBe(true)
    process.env.SOGEPAY_ENABLED = 'false'
    expect(isSogepayConfigured()).toBe(false)
  })

  it('isSogepayCallbackVerificationConfigured reflects the webhook secret', () => {
    delete process.env.SOGEPAY_WEBHOOK_SECRET
    expect(isSogepayCallbackVerificationConfigured()).toBe(false)
    process.env.SOGEPAY_WEBHOOK_SECRET = SECRET
    expect(isSogepayCallbackVerificationConfigured()).toBe(true)
  })
})

describe('verifySogepaySignature (fail-closed HMAC)', () => {
  const original = { ...process.env }
  afterEach(() => {
    process.env = { ...original }
  })

  it('fails closed when no secret is configured (even with a plausible signature)', () => {
    delete process.env.SOGEPAY_WEBHOOK_SECRET
    const body = '{"orderId":"123","status":"paid"}'
    expect(verifySogepaySignature(body, sign(body))).toBe(false)
  })

  it('accepts a correct signature', () => {
    process.env.SOGEPAY_WEBHOOK_SECRET = SECRET
    const body = '{"orderId":"123","status":"paid","amount":"500"}'
    expect(verifySogepaySignature(body, sign(body))).toBe(true)
  })

  it('accepts a correct signature with a sha256= prefix', () => {
    process.env.SOGEPAY_WEBHOOK_SECRET = SECRET
    const body = 'orderId=123&status=paid'
    expect(verifySogepaySignature(body, `sha256=${sign(body)}`)).toBe(true)
  })

  it('rejects a signature computed with the wrong secret', () => {
    process.env.SOGEPAY_WEBHOOK_SECRET = SECRET
    const body = '{"orderId":"123"}'
    expect(verifySogepaySignature(body, sign(body, 'wrong_secret'))).toBe(false)
  })

  it('rejects when the body has been tampered with', () => {
    process.env.SOGEPAY_WEBHOOK_SECRET = SECRET
    const original = '{"orderId":"123","amount":"500"}'
    const tampered = '{"orderId":"123","amount":"5"}'
    expect(verifySogepaySignature(tampered, sign(original))).toBe(false)
  })

  it('rejects a missing/empty signature', () => {
    process.env.SOGEPAY_WEBHOOK_SECRET = SECRET
    const body = '{"orderId":"123"}'
    expect(verifySogepaySignature(body, null)).toBe(false)
    expect(verifySogepaySignature(body, '')).toBe(false)
  })

  it('rejects a non-hex / wrong-length signature without throwing', () => {
    process.env.SOGEPAY_WEBHOOK_SECRET = SECRET
    const body = '{"orderId":"123"}'
    expect(verifySogepaySignature(body, 'not-a-hex-signature')).toBe(false)
  })
})

describe('parseSogepayCallbackPayload', () => {
  it('extracts fields and marks a successful payment as paid', () => {
    const result = parseSogepayCallbackPayload({
      orderId: '12345',
      transactionId: 'TX-9',
      amount: '500',
      status: 'success',
    })
    expect(result).toEqual({ orderId: '12345', transactionId: 'TX-9', amount: 500, status: 'success', paid: true })
  })

  it('tolerates alternative field names', () => {
    const result = parseSogepayCallbackPayload({
      order_id: '777',
      trans_id: 'abc',
      cost: '250',
      payment_status: 'APPROVED',
    })
    expect(result.orderId).toBe('777')
    expect(result.transactionId).toBe('abc')
    expect(result.amount).toBe(250)
    expect(result.paid).toBe(true)
  })

  it('treats a "00" response code as paid (common card-gateway approval code)', () => {
    expect(parseSogepayCallbackPayload({ orderId: '1', responseCode: '00' }).paid).toBe(true)
  })

  it('honors an explicit boolean paid/success flag', () => {
    expect(parseSogepayCallbackPayload({ orderId: '1', success: true }).paid).toBe(true)
    expect(parseSogepayCallbackPayload({ orderId: '1', paid: 'true' }).paid).toBe(true)
  })

  it('does NOT mark a declined/pending payment as paid', () => {
    expect(parseSogepayCallbackPayload({ orderId: '1', status: 'declined' }).paid).toBe(false)
    expect(parseSogepayCallbackPayload({ orderId: '1', status: 'pending' }).paid).toBe(false)
    expect(parseSogepayCallbackPayload({ orderId: '1' }).paid).toBe(false)
  })

  it('returns null for missing identifiers/amount rather than guessing', () => {
    const result = parseSogepayCallbackPayload({ status: 'success' })
    expect(result.orderId).toBeNull()
    expect(result.transactionId).toBeNull()
    expect(result.amount).toBeNull()
  })
})

describe('isSogepayPaidAmountAcceptable', () => {
  it('accepts an exact match (verified)', () => {
    expect(isSogepayPaidAmountAcceptable(500, 500)).toMatchObject({ ok: true, verified: true })
  })

  it('rejects a verified mismatch', () => {
    expect(isSogepayPaidAmountAcceptable(500, 1)).toMatchObject({ ok: false, verified: true })
  })

  it('does not verify (and does not block) when the amount is missing', () => {
    expect(isSogepayPaidAmountAcceptable(500, null)).toMatchObject({ ok: true, verified: false })
  })

  it('does not verify when the expected amount is invalid', () => {
    expect(isSogepayPaidAmountAcceptable(0, 500)).toMatchObject({ ok: true, verified: false })
  })
})
