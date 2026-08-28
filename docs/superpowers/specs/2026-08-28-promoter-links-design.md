# Promoter links & commissions — design

**Date:** 2026-08-28
**Status:** Draft — awaiting owner review
**Replaces:** the dead `app/api/affiliates/route.ts` stub (to be deleted)

## 1. Summary

Let an organizer hand each of their promoters (street team, *anbasadè*, influencers) a
personal event link — `tikem.co/events/{id}?ref=CODE` — and have Tikèm attribute every
resulting sale to that promoter and ledger a commission the organizer owes them — a
percentage of sales or a flat amount per ticket, the organizer's choice per promoter.
The promoter follows their own sales from a tokenized stats page with **no account
required**, mirroring how guest ticket pages already work — and can claim that record
into a Tikèm account to get a portal aggregating everything they promote (the same
offered-after-never-demanded-before pattern as guest tickets).

The feature deliberately copies the promo-code architecture end to end: client capture →
untrusted input re-resolved server-side → resolved doc id carried on the payment →
exactly-once bookkeeping inside the existing fulfillment claim.

### Phases

- **Phase 1 (this spec):** links, attribution, commission ledger, organizer dashboard,
  promoter stats page + account portal. Commission is *informational*: Tikèm computes and
  displays what the organizer owes each promoter; the organizer settles directly
  (person-to-person MonCash is the norm in Haiti). No money moves through Tikèm on the
  promoter's behalf.
- **Phase 2 (out of scope here, direction only):** commission becomes a real deduction —
  withheld from the organizer's releasable balance and withdrawable by the promoter via
  the existing `withdrawal_requests` rails. Deferred because the earnings machinery has no
  per-sale ledger today, which must exist before automated splits are trustworthy. (The
  two money-math quirks found during exploration — `addTicketToEarnings` dropping
  `feeIncidence`, and the dead currency-mangling `getTotalAvailableBalance` — were fixed
  and removed respectively on 2026-08-28.) Phase 1's `promoter_sales` ledger is designed
  to be the input Phase 2 consumes.

## 2. Non-goals (v1)

- No self-serve promoter signup or platform-wide affiliate program. Promoters exist only
  as records an organizer creates on their own event; the portal (§7) lets a promoter
  *claim* those records into an account, never create them.
- No click tracking — sales only. (Two `BuyTicketButton` instances render per page; a
  click ping needs dedupe we don't need yet.)
- No cross-visit attribution window. The ref survives the *session* (sessionStorage +
  the order doc), not a return visit days later by another path.
- No mobile-app capture. The buyer flow is web (where IG/WhatsApp links land). Server
  routes will accept `refCode` from any client, so threading it through
  `mobile/components/PaymentModal.tsx` later is additive.
- No automated payout (Phase 2).
- Legacy routes (`create-checkout-session`, old `moncash/initiate+callback`) are not
  instrumented — both have zero in-repo callers.

## 3. Data model

### `event_promoters` (new collection)

One doc per promoter per event. Modeled on `promo_codes`.

```
{
  event_id: string            // immutable
  organizer_id: string        // denormalized for dashboard queries
  code: string                // uppercased, unique within the event, e.g. "STEEVE"
  name: string                // display name, e.g. "Steeve L."
  contact: string | null      // phone or email, organizer's reference only
  commission_type: 'percentage' | 'flat_per_ticket'
  commission_value: number    // percentage 0–50 (default 10), or a flat amount per
                              // ticket in event-currency cents
  is_active: boolean
  stats_key: string           // 48-hex random key; the tokenized stats link is
                              // HMAC-derived from it (guestTokenFor pattern) — never
                              // stored as a bearer token
  claimed_by_uid: string | null // set when the promoter adds this record to their
                                // Tikèm account (portal); mirrors guest_orders.claimedByUid
  // counters, server-incremented only:
  tickets_sold: number
  orders_count: number
  gross_cents: number         // event-currency face value attributed
  commission_cents: number    // event-currency commission accrued
  currency: string            // event currency, stamped at creation
  created_at, updated_at
}
```

### `promoter_sales` (new collection, append-only, server-only)

One row per fulfilled order (not per ticket), written inside the fulfillment claim.
This is the audit ledger and the Phase 2 input.

```
{
  promoter_id, event_id, organizer_id, ref_code,
  ticket_ids: string[],
  quantity: number,
  order_gross_cents: number       // face value after promo discount, event currency
  commission_type: 'percentage' | 'flat_per_ticket'  // snapshot at sale time
  commission_value: number                           // snapshot at sale time
  commission_cents: number        // computed per §5
  currency: string                // event currency
  payment_method: string          // 'stripe' | 'moncash' | 'natcash' | 'sogepay' | 'free'
  payment_id: string | null,
  buyer_key: string               // promoBuyerKey()-style stable id (uid / email hash)
  status: 'accrued' | 'reversed'
  created_at
}
```

Free claims write a row with `commission_cents: 0` so promoters get credit for driving
RSVPs without creating an obligation.

### Ticket documents

Two new fields at every creation site and Firestore mirror: `promoter_id`,
`promoter_code`. Tickets are readable by buyer/organizer/staff (`firestore.rules:248-253`),
so only these opaque identifiers go on the ticket — rates and money stay in
`promoter_sales`. Ticket update rules already prevent staff mutation of new fields
(`firestore.rules:270-288` allowlist).

### `pending_transactions`

New fields written at MonCash/SogePay initiate: `promoter_id`, `promoter_code`. The
collection is server-only (default deny), so this is invisible to clients.

## 4. Attribution flow

### Capture (client)

`app/events/[id]/BuyTicketButton.tsx` — already the single funnel for all four live
purchase paths and already `'use client'`:

- On mount, read `new URLSearchParams(window.location.search).get('ref')` inside a
  `useEffect` (avoids the `useSearchParams` Suspense requirement and keeps
  `app/events/[id]/page.tsx` on its `revalidate = 300` cache — the page must NOT gain a
  `searchParams` prop).
- Normalize (trim, uppercase, `/^[A-Z0-9_-]{2,24}$/`), store in state **and**
  `sessionStorage` under `tikem_ref:{eventId}` so it survives in-app-browser reloads and
  the MonCash/SogePay round trip. Last click wins (a newer `?ref=` overwrites).
- Thread `refCode` into the four request bodies: claim-free (`:538` call site), SogePay
  (`:664`), MonCash (`:745`), and as a new prop on `EmbeddedStripePayment` → its
  `create-payment-intent` body (`EmbeddedStripePayment.tsx:289`).

No validate endpoint and no UI acknowledgement: unlike a promo code, a ref changes
nothing the buyer sees. Invalid/inactive refs must **never block or slow a sale** — the
server silently drops them.

### Carry (server, initiate-time)

Each entry point accepts optional `refCode`, resolves it exactly like
`resolvePromoCode` does (accept code, look up active `event_promoters` doc scoped to
this event, never trust the raw string), and persists only the resolved doc id + code:

| Entry point | Accept | Persist |
|---|---|---|
| `app/api/create-payment-intent/route.ts` (body `:42-53`) | `refCode` | PI `metadata.promoterId`, `metadata.promoterCode` (`:367-406` bag; 24/50 keys used) |
| `app/api/moncash-button/initiate/route.ts` (`:95-116`) | `refCode` | `pending_transactions.promoter_id/_code` (`:355-384` insert) |
| `app/api/sogepay/initiate/route.ts` (`:33`) | `refCode` | `pending_transactions.promoter_id/_code` (`:249-273` insert) |
| `app/api/tickets/claim-free/route.ts` (`:150`) | `refCode` | direct to ticket + ledger (single request, no carrier) |

Resolution failure (unknown code, inactive, wrong event) → proceed without attribution.

### Attribute (server, fulfillment-time)

At the four live fulfillment sites — each already holding an exactly-once claim
(`pi_fulfill_*` / pending-transaction claim) and already adjacent to
`redeemPromoInTransaction` + `addTicketToEarnings`:

1. `app/api/tickets/create-from-payment/route.ts` (ticket build `:175-219`, hook near `:266-300`)
2. `app/api/webhooks/stripe/route.ts` payment_intent path (ticket `:473-495`, mirror `:519-540`, hook near `:565-590`)
3. `app/api/moncash-button/return/route.ts` (ticket `:536-570`, mirror `:596-627`, hook near `:644-670`)
4. `lib/tickets/fulfillment.ts` (shared MonCash/SogePay; ticket `:262-292`, mirror `:318-350`, hook near `:367-394`)

plus `claim-free` (`:516-543`), do:

- stamp `promoter_id` / `promoter_code` on each ticket doc and mirror;
- write one `promoter_sales` row;
- in a Firestore transaction, increment the `event_promoters` counters
  (`redeemPromoInTransaction`, `lib/promo-codes.ts:295-395`, is the template).

Bookkeeping failure must never break a confirmed sale — same posture as promo
redemption (`lib/promo-codes.ts:392-398`): log loudly, don't throw.

A shared helper `recordPromoterSale(...)` in a new `lib/promoters.ts` keeps the five
sites to one-line calls, alongside `resolvePromoterCode(eventId, input)`.

## 5. Commission math

- Base: **order face value after promo discount, in event currency** — the same
  `price_paid × quantity` the organizer's gross is built from. Buyer-paid service fees
  and processing fees are excluded (they were never the organizer's money).
- Two commission types, chosen by the organizer per promoter:
  - `percentage`: `commission_cents = Math.round(order_gross_cents * commission_value / 100)`
  - `flat_per_ticket`: `commission_cents = commission_value * quantity` (value is
    event-currency cents per ticket)
- Computed once at fulfillment with type + value snapshotted onto the ledger row.
  Later edits to a promoter's terms affect future sales only.
- Free tickets: attributed, `commission_cents = 0` for **both** types — a flat fee on a
  zero-revenue ticket would create an obligation on money the organizer never received.
  If an organizer wants to pay per RSVP, that's a Phase 2 conversation.
- Currency is always the event currency; no FX is involved (matches how
  `event_earnings` stores money).

### Reversals

When a ticket is refunded/cancelled through the admin flow that calls
`refundTicketFromEarnings` (`lib/earnings.ts:726`), a hook marks the matching
`promoter_sales` row `status: 'reversed'` and decrements the promoter counters. v1
scope: full-order reversal only (partial-quantity refunds don't exist in the product
today).

## 6. API surface

- `GET/POST /api/organizer/events/[id]/promoters` — list / create (ownership check via
  the `assertEventOwnedByUser` pattern, `app/api/promo-codes/route.ts:21`; dupe-code
  check mirrors `:56-64`). POST returns the share link and the stats link.
- `PATCH/DELETE /api/organizer/events/[id]/promoters/[promoterId]` — edit
  name/contact/commission terms, toggle `is_active`, delete (only if `orders_count === 0`;
  otherwise deactivate — the ledger must stay reconcilable).
- `GET /api/promoter/stats?token=…` — verifies the HMAC token (§8), returns the
  promoter's own stats + recent sales (event title, date, qty, commission; **no buyer
  PII** — names/emails stay organizer-side).
- `POST /api/promoter/claim` — auth required; body `{ token }`. Verifies the HMAC token
  and sets `claimed_by_uid` on that promoter record. Idempotent for the same uid;
  refuses if already claimed by a different account — same posture as
  `app/api/tickets/guest/claim/route.ts`.
- `GET /api/promoter/portfolio` — auth required; returns every `event_promoters` record
  with `claimed_by_uid == uid`, joined with event title/date/currency, for the portal.
- Delete `app/api/affiliates/route.ts`.

## 7. UI

### Organizer — `app/organizer/events/[id]/promoters/`

New per-event page (server page + client manager, same split as
`promo-codes/PromoCodeManager.tsx`):

- Promoter list: name, code, rate, tickets sold, gross, **commission owed**, active
  dot+label (never a filled status pill), per-row copy-link and WhatsApp-share buttons
  (share intent pattern from `EventMarketingClient.tsx:56-70` — the message is a ready
  Kreyòl/English blurb with the promoter's link).
- Create/edit drawer: name, contact, code (auto-suggested from the name, editable),
  commission — a percentage **or** a flat amount per ticket in the event currency.
- "Send them their stats page" action: copies the tokenized stats link.
- Section headings use `SectionHeader` (Instrument Serif convention).
- Entry points: a card on `app/organizer/events/[id]/marketing/` and a row in the event
  command center nav. The in-memory UTM builder at
  `app/organizer/events/[id]/tracking/` stays as-is for now (external-analytics use);
  fold-in is a later cleanup.

### Promoter — tokenized page + portal

**`app/promoter/[token]/page.tsx`** — public tokenized page, copying the discipline of
`app/tickets/guest/[token]/page.tsx`: verify token **before any read**,
`dynamic = 'force-dynamic'`, `robots: noindex`. POSH dark styling. Shows: event, their
code and link (with copy + WhatsApp share), tickets sold, gross, commission earned, and
"commission is paid to you directly by the organizer" copy. Below the stats, an
**account offer** (the `GuestAccountOffer` pattern, `app/tickets/guest/[token]/page.tsx:168-188`):
sign in / sign up, then `POST /api/promoter/claim` attaches this promoter record to
their account. Offered after the stats are already visible — never demanded before.

**`app/promoter/page.tsx`** — the promoter portal, auth required. Aggregates every
claimed promoter record across events: per-event cards (event, code, link, tickets,
gross, commission owed, organizer name) plus lifetime totals per currency. Linked from
the account menu when the user has at least one claimed record. A promoter who never
signs up loses nothing — each tokenized page keeps working forever.

## 8. Security

- **Stats token:** `{stats_key}.{HMAC-SHA256(stats_key)}` exactly per
  `lib/guest/identity.ts:176-218` — deterministic re-derivation, `timingSafeEqual`
  verify, 200-char cap. New secret env `PROMOTER_LINK_SECRET` with the same fallback
  chain as `linkSecret()` (`:163-174`). Compromise of a token exposes one promoter's
  own stats only.
- **Rules:** `event_promoters` copies the `promo_codes` block
  (`firestore.rules:319-341`): organizer-of-event read/create/update/delete, with
  `event_id` and all counter fields immutable from clients; additionally
  `allow read: if request.auth.uid == resource.data.claimed_by_uid` so a claimed
  promoter can read their own record (writes stay organizer/server-only —
  `claimed_by_uid` is set by the claim API via Admin SDK). `promoter_sales` copies
  `promo_code_usage` (`:348-351`): `read: false, write: false` — Admin SDK only.
- **Abuse:** ref resolution is read-only and silently drops bad input, so there is no
  enumeration oracle and nothing to throttle at capture time. Self-referral (a promoter
  buying through their own link) is allowed — it's a real sale; the organizer sets the
  rate and can deactivate anyone.
- **Indexes** (`firestore.indexes.json`): `event_promoters(event_id, created_at)`,
  `promoter_sales(promoter_id, created_at)`, `promoter_sales(event_id, created_at)`.
  No new `tickets` composite needed — dashboards read the ledger, not tickets.

## 9. Edge cases

| Case | Behavior |
|---|---|
| Ref code invalid / inactive / wrong event | Sale proceeds unattributed; no error surfaced |
| Ref + promo code together | Both apply independently (promo discounts, ref attributes); commission computed on the discounted gross |
| Buyer opens two promoters' links | Last click wins (sessionStorage overwrite) |
| Gateway round-trip (MonCash/SogePay) | Attribution rides `pending_transactions`, immune to cookie/WebView loss |
| Webhook vs client-confirm race (Stripe) | Both fulfillment sites read the same PI metadata under the existing `pi_fulfill_*` claim — exactly-once by construction |
| Promoter deactivated mid-flight | Resolution happened at initiate; in-flight orders still credit them |
| Ticket refunded | Ledger row `reversed`, counters decremented |
| Organizer edits commission terms | Future sales only (type + value snapshotted per row) |
| Promoter record claimed by account A, token opened by account B | Claim refused; token page still renders (it's promoter-facing stats, not money movement) |

## 10. Testing

- Unit (`__tests__/unit/lib/`): `resolvePromoterCode` scoping/normalization; commission
  math for both types incl. promo-discounted gross, flat × quantity, and free orders;
  promoter token sign/verify/tamper (mirror `guest-identity.test.ts:48-88`); claim
  idempotency/conflict; reversal math.
- Integration-style route tests: each initiate route persists `promoter_id` only for a
  valid active code; each fulfillment site writes exactly one ledger row under a
  simulated double-delivery (claim contention).
- Manual: full IG-WebView pass — tap `?ref=` link → MonCash sandbox → return → ticket
  stamped, ledger row present, both dashboards agree.

## 11. Rollout

1. `lib/promoters.ts` + rules + indexes (deploy `firestore:rules` and `firestore:indexes`).
2. Server threading (initiates + fulfillments) behind the presence of data only — no
   flag needed; with zero `event_promoters` docs the code paths are inert.
3. Organizer UI + promoter stats page.
4. Delete `app/api/affiliates/route.ts`.
5. Announce to organizers once one real event has run a promoter link end to end.
