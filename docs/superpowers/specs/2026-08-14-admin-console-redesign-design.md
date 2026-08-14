# Admin console redesign

**Date:** 2026-08-14
**Status:** Approved design, not yet implemented
**Scope:** The `/admin` shell, its landing view, and all ~19 admin subpages

---

## Problem

`/admin` is a seven-tab top nav over full-width pages. It borrows the public
site's chrome, so it reads as the consumer product wearing an admin hat rather
than a tool built for the work.

Two failures follow from that:

**The landing answers the wrong question.** It shows totals. The question an
admin opens the console with is "what has been waiting, and how long?" Twelve
verifications filed this morning is fine; two filed last week is not. A count
cannot tell those apart.

**Queue state is invisible outside its own tab.** `AdminTopNav` badges exactly
one figure — pending verifications plus pending bank verifications, from
`useAdminPendingCount`. Payout review, disbursements, withdrawals, disputes and
reported events have no live count anywhere in the shell. You have to visit a
tab to discover it needed you.

## Who this is for

A small team sharing the same queues. Claiming and assignment are explicitly
**out of scope** for this pass (see Non-goals) — but the design must make it
visible that a queue is moving and who is moving it, so two admins don't
silently duplicate work.

---

## Design direction

### Thesis: age is the primary visual dimension

Every item in this console has an age, and age is what carries the signal. A
payout waiting is an organizer not getting paid. So age, not status, is what the
interface is built around:

- Every queue row carries a right-aligned monospace age.
- Every queue in the sidebar reads `count · oldest`. `Verifications 12 · 4d`
  says something `Verifications 12` cannot.

This also settles the status-pill question — filled `PENDING` / `PUBLISHED`
badges are out anyway (existing product rule: use a dot plus a label). Age
replaces them as the at-a-glance signal.

### Tokens

Reuses the existing system. No new palette.

| Role | Value | Source |
|---|---|---|
| Canvas | `#0a0a0a` | `globals.css` body |
| Sidebar rail | `#0a0a0a` with `border-white/10` hairline | existing convention |
| Text primary / secondary / tertiary | `white`, `white/70`, `white/45` | existing |
| Accent (active nav, links) | `brand-400` `#2DD4BF` | `tailwind.config.ts` |
| Age — fresh (< 24h) | `white/45` | quiet on purpose |
| Age — waiting (1–3d) | `warning-500` `#EAB308` | `tailwind.config.ts` |
| Age — overdue (> 3d) | `error-500` `#EF4444` | `tailwind.config.ts` |

Teal never signals urgency, so it never competes with the age scale.

### Type roles

| Role | Face | Where |
|---|---|---|
| Page title | Instrument Serif (`font-display`) | The page title, and nowhere else |
| UI | Space Grotesk (`font-grotesk`) | Nav, controls, column headers, buttons |
| Data | JetBrains Mono (`label-mono`, `tabular-nums`) | Ages, amounts, counts, IDs |

One serif moment per page keeps admin recognisably Tikèm without making a work
tool feel like a poster. Row height drops to 44px.

### Signature

The aging column, running down every queue in the console, plus `count · oldest`
in the sidebar. It is the one memorable device, and it encodes something true
about the content rather than decorating it.

---

## Shell

A persistent left sidebar replaces `AdminTopNav`.

```
┌──────────────┬─────────────────────────────────────────────────┐
│ tikèm ADMIN  │                                                 │
│              │  Needs you                        14 waiting    │
│ ▸ Needs you  │  ───────────────────────────────────────────    │
│   Inbox   14 │                                                 │
│              │  Ayiti Events        bank verification     6d   │
│ QUEUES       │  Sonia Pierre        ID verification       4d   │
│  Verif  12·4d│  HTG 45,000 → Ticket Nord   payout review  2d   │
│  Payouts 2·2d│  "Fèt Nwèl 2026"     reported ×3          19h   │
│  Reported 1  │  Kesnel Joseph       ID verification       2h   │
│  Disputes 0  │  …                                              │
│              │                                                 │
│ BROWSE       │  Cleared today — 6 · by ted 4, by mireille 2    │
│  People      │                                                 │
│  Events      │                                                 │
│  Orders      │                                                 │
│  Analytics   │                                                 │
│ ──────────   │                                                 │
│  Settings    │                                                 │
└──────────────┴─────────────────────────────────────────────────┘
```

The rail separates **QUEUES** (things that need a decision) from **BROWSE**
(things you look up). That distinction is the actual mental model, and the
current seven tabs flatten it.

**Rail grouping.** The seven queue sources below collapse into four rail
entries, because two pairs are one job to an admin: bank verifications fold into
`Verifications`, and withdrawals fold into `Payouts`. Each rail entry's `count`
is the sum of its sources and its `oldest` is the max — so a rail entry never
under-reports. The merged landing list keeps them distinct, since the row has
room to say which decision it needs.

**Responsive:** 240px fixed rail at `lg` and up; icon-only rail at `md`; a drawer
below `md`, where `MobileNavWrapper` continues to handle bottom navigation.

**Quality floor:** visible keyboard focus on every rail item, `aria-current` on
the active route, reduced motion respected, and the rail is a `<nav>` landmark.

## Landing: a list, not a dashboard

`/admin` becomes one list — every queue merged, sorted oldest first. The answer
to "what do I do now" is the top row. **No charts and no totals**; analytics
keeps its own route, where a chart means something.

Each row: subject, what kind of decision it needs, age. Clicking goes to that
item in its queue.

The `Cleared today` footer is the concession to a shared-queue team without
building assignment. It reads from `lib/admin/audit-log.ts`, which already
records `adminId`, `adminEmail`, `adminName`, `action` and `timestamp` per
action — so per-actor counts need a filtered read, not new writes.

---

## Subpages: 19 routes, 5 archetypes

The subpages are not 19 bespoke redesigns. They are five archetypes, and two
shared components carry most of the work.

| Archetype | Routes | Treatment |
|---|---|---|
| **Queue** | `verify`, `bank-verifications`, `payouts/review`, `disbursements`, `withdrawals`, `disputes`, `events` (pending + reported tabs) | Shared `QueueTable`: 44px rows, age column, one primary action per row, bulk select |
| **Register** | `users`, `organizers`, `orders`, `events` (published tab) | Same table, no age column; search and filters in a sticky subheader |
| **Detail** | `organizers/[id]`, `users/[id]` | Identity header, then evidence. The events list added 2026-08-14 is this shape |
| **Insight** | `analytics`, `security` | The only routes where charts live |
| **Config** | `settings`, `payouts/release-settings` | Narrow single column, labelled rows, explicit save |

`admin/dev/*` keeps its own layout and is left alone.

### Shared components

**`AdminPage`** — title (the one serif moment), optional description, optional
action slot, consistent page padding. Replaces the per-page header markup that
currently varies route to route.

**`QueueTable`** — columns, 44px rows, the age column, row action, empty state,
bulk select. Generic over row shape; each queue supplies its columns and its
action handler.

---

## Queue counts endpoint

The sidebar's `count · oldest` needs a per-queue count *and* an oldest
timestamp. `AdminRealtimeProvider` supplies neither for five of the seven
queues, so this is new work, not a freebie.

Add `GET /api/admin/queues/summary`, returning `{ count, oldestAt }` per queue,
fed into `AdminRealtimeProvider` alongside the existing metrics so there is
still exactly one poll.

Sources, all confirmed against current code:

| Queue | Source | Pending predicate | Age field |
|---|---|---|---|
| Verifications | `verification_requests` | `status in ['pending_review','in_review','pending']` | `createdAt` |
| Bank verifications | `verificationDocuments` (collection group) | `type == 'bank' && status == 'pending'` | `submittedAt` |
| Payout review | `payout_review_queue` | `status == 'pending'` | `createdAt` |
| Disbursements | `payouts` (collection group) | `status in ['pending','approved']` | `createdAt` |
| Withdrawals | `withdrawal_requests` | `status == 'pending'` | `createdAt` |
| Disputes | `disputes` (`DISPUTES_COLLECTION`, `lib/disputes.ts`) | open (currently split client-side) | `updatedAt` |
| Events | `events` | `is_published == false && rejected == false`; `reports_count > 0` | `created_at` |

Two constraints carried over from existing code:

- `lib/firestore/admin.ts` already wraps its verification counts in a
  try/catch with a full-scan fallback, because these queries fail when an index
  is cold. The summary endpoint must degrade the same way — per queue, so one
  failing queue returns `null` rather than emptying the whole sidebar.
- Firestore drops documents missing a filtered field. The events predicates
  depend on `is_published` / `rejected` / `reports_count` being present on every
  event, which the moderation backfill guarantees. Do not add a filtered field
  to these queries without backfilling it first.

Each queue needs `count` (an aggregation) and `oldestAt` (a one-document
ascending read), so 14 reads per poll. At the provider's current 10s interval
that is the dominant new cost — the endpoint caches for the poll interval so
concurrent admins share one set of reads.

---

## Non-goals

- **Claiming and assignment.** No `assigned_to` / `claimed_at`, no Firestore
  rules changes, no "mine vs unassigned" filter. Deferred deliberately: ship the
  shell, then learn from use what coordination is actually needed.
- **New queue behaviour.** Approve, reject and payout actions keep their current
  API routes and semantics. This pass changes presentation.
- **`admin/dev/*`.** Untouched.
- **Analytics content.** `analytics` and `security` get the shell and the page
  header; their charts are not redesigned.

## Risks

**Regression surface.** The shell change touches every admin route. Mitigation:
`AdminPage` and `QueueTable` land first with one queue migrated, so the pattern
is proven before the other six move.

**Count cost.** 14 reads per 10s poll, shared across admins. If that proves
expensive, raise the poll interval for the summary specifically — the counts do
not need 10s freshness the way the verification badge does.

**Density on mobile.** 44px rows with an age column are tight on a phone. The
age column stays; the secondary columns collapse below `sm`.

## Success criteria

- Opening `/admin` shows what is waiting, oldest first, with no chart.
- Every queue's count and oldest age are visible from any admin route.
- All seven queue routes render through one `QueueTable`.
- No filled status pills anywhere in the console.
- One serif page title per page; every age, amount and ID in tabular mono.
