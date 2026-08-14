# Admin Console Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/admin` seven-tab top nav with a persistent sidebar console whose organizing signal is how long each item has been waiting, and route all admin subpages through five shared archetypes.

**Architecture:** Two new pure modules (`lib/admin/age.ts`, `lib/admin/queue-summary.ts`) feed a new `/api/admin/queues/summary` endpoint, which joins the existing `AdminRealtimeProvider` poll. Presentation is carried by three new components — `AdminSidebar`, `AdminPage`, `QueueTable` — that the 19 admin routes adopt one at a time. No queue behaviour changes: every approve/reject/payout action keeps its current API route.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Firestore (firebase-admin), Jest 30 + @testing-library/react 16.

**Spec:** `docs/superpowers/specs/2026-08-14-admin-console-redesign-design.md`

## Global Constraints

- **Canvas** `#0a0a0a`; hairlines `border-white/10`; text `white` / `white/70` / `white/45`.
- **Accent** `brand-400` (`#2DD4BF`) — active nav and links ONLY. Never used to signal urgency.
- **Age tiers** — fresh `< 24h` → `text-white/45`; waiting `1–3d` → `text-warning-500`; overdue `> 3d` → `text-error-500`. These are the only three.
- **Type roles** — page title `font-display` (Instrument Serif), exactly one per page. Nav/controls/column headers `font-grotesk`. Every age, amount, count and ID uses `label-mono` + `tabular-nums`.
- **Row height** 44px (`h-11`) in every table.
- **No filled status pills.** State is a dot plus a label. This is an existing product rule.
- **Out of scope:** claiming/assignment (`assigned_to`, `claimed_at`), Firestore rules changes, `admin/dev/*`, and the chart contents of `analytics` / `security`.
- **Tests:** Jest, files under `__tests__/`, run with `npx jest <path>`. Import from `@jest/globals`. Path alias `@/` maps to repo root.
- **Firestore caution:** Firestore drops documents missing a filtered field. Do not add a filtered field to any query in this plan without backfilling it first.

---

## File Structure

**Create:**
- `lib/admin/age.ts` — age formatting and tier classification. Pure, no I/O.
- `lib/admin/queue-summary.ts` — reads `{count, oldestAt}` per queue from Firestore, degrading per queue.
- `app/api/admin/queues/summary/route.ts` — admin-gated endpoint over the above.
- `components/admin/AdminSidebar.tsx` — the persistent rail.
- `components/admin/AdminPage.tsx` — page shell (title, description, action slot).
- `components/admin/QueueTable.tsx` — the shared 44px-row table with the age column.
- `lib/admin/needs-you.ts` — merges every queue into one oldest-first list.
- `lib/admin/needs-you-data.ts` — reads the landing rows from Firestore, degrading per queue.
- `__tests__/admin-age.test.ts`, `__tests__/admin-queue-summary.test.ts`, `__tests__/admin-needs-you.test.ts`, `__tests__/admin-queue-table.test.tsx`

**Modify:**
- `lib/realtime/AdminRealtimeProvider.tsx` — carry queue summaries alongside metrics.
- `app/admin/layout.tsx` — swap `AdminTopNav` for `AdminSidebar`.
- `app/admin/page.tsx` + `app/admin/AdminDashboardClient.tsx` — become the "Needs you" list.
- The seven queue routes (Tasks 10–16), three registers (Task 17), two detail pages (Task 18), and the config + insight pages (Task 19).

**Delete (Task 20, last):**
- `components/admin/AdminTopNav.tsx`, `components/admin/WorkQueueCard.tsx`

---

## Task 1: Age formatting and tiers

**Files:**
- Create: `lib/admin/age.ts`
- Test: `__tests__/admin-age.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatAge(iso: string | null | undefined, now?: Date): string`, `ageTier(iso, now?): AgeTier`, `ageClass(iso, now?): string`, `type AgeTier = 'none' | 'fresh' | 'waiting' | 'overdue'`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/admin-age.test.ts
import { describe, it, expect } from '@jest/globals'
import { formatAge, ageTier, ageClass } from '../lib/admin/age'

const NOW = new Date('2026-08-14T12:00:00.000Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR

describe('formatAge', () => {
  it('renders minutes under an hour', () => {
    expect(formatAge(ago(5 * MIN), NOW)).toBe('5m')
  })
  it('renders hours under a day', () => {
    expect(formatAge(ago(19 * HOUR), NOW)).toBe('19h')
  })
  it('renders days beyond a day', () => {
    expect(formatAge(ago(6 * DAY), NOW)).toBe('6d')
  })
  it('floors rather than rounds, so nothing reads older than it is', () => {
    expect(formatAge(ago(47 * HOUR), NOW)).toBe('1d')
  })
  it('renders a just-created item as 0m, not empty', () => {
    expect(formatAge(ago(10), NOW)).toBe('0m')
  })
  it('returns an em dash for missing or unparseable input', () => {
    expect(formatAge(null, NOW)).toBe('—')
    expect(formatAge(undefined, NOW)).toBe('—')
    expect(formatAge('not-a-date', NOW)).toBe('—')
  })
  it('does not render a negative age for a future timestamp', () => {
    expect(formatAge(new Date(NOW.getTime() + HOUR).toISOString(), NOW)).toBe('0m')
  })
})

describe('ageTier', () => {
  it('is fresh under 24h', () => {
    expect(ageTier(ago(23 * HOUR), NOW)).toBe('fresh')
  })
  it('is waiting from 24h to 3d', () => {
    expect(ageTier(ago(25 * HOUR), NOW)).toBe('waiting')
    expect(ageTier(ago(3 * DAY - MIN), NOW)).toBe('waiting')
  })
  it('is overdue beyond 3d', () => {
    expect(ageTier(ago(3 * DAY + MIN), NOW)).toBe('overdue')
  })
  it('is none when there is no timestamp', () => {
    expect(ageTier(null, NOW)).toBe('none')
  })
})

describe('ageClass', () => {
  it('maps each tier to its one colour', () => {
    expect(ageClass(ago(1 * HOUR), NOW)).toBe('text-white/45')
    expect(ageClass(ago(2 * DAY), NOW)).toBe('text-warning-500')
    expect(ageClass(ago(9 * DAY), NOW)).toBe('text-error-500')
    expect(ageClass(null, NOW)).toBe('text-white/45')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/admin-age.test.ts`
Expected: FAIL — `Cannot find module '../lib/admin/age'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/admin/age.ts
/**
 * How long an admin queue item has been waiting, and how loudly to say it.
 *
 * Age is the console's organizing signal (see the redesign spec): a count says
 * how much work there is, an age says whether you are behind. These are pure so
 * the same thresholds drive the sidebar, the landing list and every queue row.
 */

export type AgeTier = 'none' | 'fresh' | 'waiting' | 'overdue'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Thresholds are inclusive of the lower bound: 24h exactly is already 'waiting'. */
const WAITING_AT = DAY
const OVERDUE_AT = 3 * DAY

function elapsed(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null
  // Clock skew between a Firestore write and this render can put a timestamp in
  // the future. Report that as brand new rather than as a negative age.
  return Math.max(0, now.getTime() - then.getTime())
}

/**
 * A compact age: "0m", "5m", "19h", "6d". Always floors — an item is never
 * shown as older than it actually is.
 */
export function formatAge(iso: string | null | undefined, now: Date = new Date()): string {
  const ms = elapsed(iso, now)
  if (ms === null) return '—'
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`
  return `${Math.floor(ms / DAY)}d`
}

export function ageTier(iso: string | null | undefined, now: Date = new Date()): AgeTier {
  const ms = elapsed(iso, now)
  if (ms === null) return 'none'
  if (ms > OVERDUE_AT) return 'overdue'
  if (ms >= WAITING_AT) return 'waiting'
  return 'fresh'
}

const TIER_CLASS: Record<AgeTier, string> = {
  none: 'text-white/45',
  fresh: 'text-white/45',
  waiting: 'text-warning-500',
  overdue: 'text-error-500',
}

export function ageClass(iso: string | null | undefined, now: Date = new Date()): string {
  return TIER_CLASS[ageTier(iso, now)]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/admin-age.test.ts`
Expected: PASS, 13 tests

- [ ] **Step 5: Commit**

```bash
git add lib/admin/age.ts __tests__/admin-age.test.ts
git commit -m "Age formatting and tiers for the admin console"
```

---

## Task 2: Queue summary reader

**Files:**
- Create: `lib/admin/queue-summary.ts`
- Test: `__tests__/admin-queue-summary.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `QUEUE_KEYS`, `type QueueKey`, `type QueueStat = { count: number; oldestAt: string | null } | null`, `type QueueSummary = Record<QueueKey, QueueStat>`, `RAIL_GROUPS`, `railStat(summary, group): QueueStat`, `getQueueSummary(): Promise<QueueSummary>`.

Note the contract that later tasks depend on: a queue that **fails to read** is `null`, distinct from a queue that is **empty** (`{count: 0, oldestAt: null}`). The sidebar renders those differently — an unreadable queue must never look like a cleared one.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/admin-queue-summary.test.ts
import { describe, it, expect } from '@jest/globals'
import { QUEUE_KEYS, RAIL_GROUPS, railStat } from '../lib/admin/queue-summary'
import type { QueueSummary } from '../lib/admin/queue-summary'

const empty = (): QueueSummary =>
  Object.fromEntries(QUEUE_KEYS.map((k) => [k, { count: 0, oldestAt: null }])) as QueueSummary

describe('QUEUE_KEYS', () => {
  it('covers all seven queue sources from the spec', () => {
    expect([...QUEUE_KEYS].sort()).toEqual(
      [
        'bankVerifications',
        'disbursements',
        'disputes',
        'pendingEvents',
        'payoutReview',
        'reportedEvents',
        'verifications',
        'withdrawals',
      ].sort()
    )
  })
})

describe('RAIL_GROUPS', () => {
  it('collapses the sources into the four rail entries', () => {
    expect(RAIL_GROUPS.map((g) => g.key)).toEqual(['verifications', 'payouts', 'reported', 'disputes'])
  })
  it('folds bank verifications into Verifications and withdrawals into Payouts', () => {
    const byKey = Object.fromEntries(RAIL_GROUPS.map((g) => [g.key, g.sources]))
    expect(byKey.verifications).toContain('bankVerifications')
    expect(byKey.payouts).toContain('withdrawals')
  })
  it('assigns every source to exactly one rail group', () => {
    const assigned = RAIL_GROUPS.flatMap((g) => g.sources)
    expect([...assigned].sort()).toEqual([...QUEUE_KEYS].sort())
    expect(new Set(assigned).size).toBe(assigned.length)
  })
})

describe('railStat', () => {
  it('sums counts across the group sources', () => {
    const s = empty()
    s.verifications = { count: 9, oldestAt: '2026-08-14T10:00:00.000Z' }
    s.bankVerifications = { count: 3, oldestAt: '2026-08-14T11:00:00.000Z' }
    expect(railStat(s, RAIL_GROUPS[0])!.count).toBe(12)
  })

  it('takes the OLDEST timestamp so a rail entry never under-reports', () => {
    const s = empty()
    s.verifications = { count: 1, oldestAt: '2026-08-14T11:00:00.000Z' }
    s.bankVerifications = { count: 1, oldestAt: '2026-08-08T09:00:00.000Z' }
    expect(railStat(s, RAIL_GROUPS[0])!.oldestAt).toBe('2026-08-08T09:00:00.000Z')
  })

  it('returns null when EVERY source failed to read', () => {
    const s = empty()
    s.verifications = null
    s.bankVerifications = null
    expect(railStat(s, RAIL_GROUPS[0])).toBeNull()
  })

  it('still reports the readable source when only one failed', () => {
    const s = empty()
    s.verifications = { count: 4, oldestAt: '2026-08-10T09:00:00.000Z' }
    s.bankVerifications = null
    expect(railStat(s, RAIL_GROUPS[0])).toEqual({ count: 4, oldestAt: '2026-08-10T09:00:00.000Z' })
  })

  it('distinguishes an empty queue from an unreadable one', () => {
    const s = empty()
    expect(railStat(s, RAIL_GROUPS[3])).toEqual({ count: 0, oldestAt: null })
    s.disputes = null
    expect(railStat(s, RAIL_GROUPS[3])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/admin-queue-summary.test.ts`
Expected: FAIL — `Cannot find module '../lib/admin/queue-summary'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/admin/queue-summary.ts
/**
 * Per-queue "how many, and how long has the oldest been waiting" for the admin
 * sidebar and the Needs You landing.
 *
 * Every source degrades on its own. lib/firestore/admin.ts already wraps its
 * verification counts in a fallback because these queries fail while an index is
 * cold — so one failing queue must return null rather than emptying the rail.
 * null (unreadable) and {count: 0} (cleared) are deliberately different values.
 */

import { adminDb } from '@/lib/firebase/admin'

export const QUEUE_KEYS = [
  'verifications',
  'bankVerifications',
  'payoutReview',
  'disbursements',
  'withdrawals',
  'disputes',
  'pendingEvents',
  'reportedEvents',
] as const

export type QueueKey = (typeof QUEUE_KEYS)[number]

export type QueueStat = { count: number; oldestAt: string | null } | null

export type QueueSummary = Record<QueueKey, QueueStat>

export interface RailGroup {
  key: 'verifications' | 'payouts' | 'reported' | 'disputes'
  label: string
  href: string
  sources: QueueKey[]
}

/**
 * The seven sources collapse to four rail entries: bank verifications and
 * organizer verifications are one job to an admin, as are withdrawals and
 * payouts.
 */
export const RAIL_GROUPS: RailGroup[] = [
  {
    key: 'verifications',
    label: 'Verifications',
    href: '/admin/verify',
    sources: ['verifications', 'bankVerifications'],
  },
  {
    key: 'payouts',
    label: 'Payouts',
    href: '/admin/disbursements',
    sources: ['payoutReview', 'disbursements', 'withdrawals'],
  },
  { key: 'reported', label: 'Reported', href: '/admin/events', sources: ['reportedEvents', 'pendingEvents'] },
  { key: 'disputes', label: 'Disputes', href: '/admin/disputes', sources: ['disputes'] },
]

/**
 * A rail entry's figure: counts sum, and the age is the OLDEST across sources so
 * the entry never under-reports how far behind it is. Null only when every
 * source failed — one readable source is still worth showing.
 */
export function railStat(summary: QueueSummary, group: RailGroup): QueueStat {
  const stats = group.sources.map((k) => summary[k]).filter((s): s is NonNullable<QueueStat> => s !== null)
  if (stats.length === 0) return null

  let count = 0
  let oldestAt: string | null = null
  for (const s of stats) {
    count += s.count
    if (s.oldestAt && (oldestAt === null || s.oldestAt < oldestAt)) oldestAt = s.oldestAt
  }
  return { count, oldestAt }
}

function toIso(value: any): string | null {
  if (!value) return null
  if (typeof value?.toDate === 'function') {
    const d = value.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : value
  }
  return null
}

/** One aggregation for the count, one 1-doc ascending read for the oldest. */
async function statFor(
  build: () => FirebaseFirestore.Query,
  ageField: string
): Promise<QueueStat> {
  try {
    const [countSnap, oldestSnap] = await Promise.all([
      build().count().get(),
      build().orderBy(ageField, 'asc').limit(1).get(),
    ])
    const count = countSnap.data().count || 0
    const oldestAt = oldestSnap.empty ? null : toIso(oldestSnap.docs[0].data()?.[ageField])
    return { count, oldestAt }
  } catch (error) {
    console.warn('[admin/queue-summary] queue read failed', error)
    return null
  }
}

/**
 * Every queue's figures. Runs the eight sources concurrently; a rejection in one
 * cannot reject the whole summary because statFor already catches.
 */
export async function getQueueSummary(): Promise<QueueSummary> {
  const events = () => adminDb.collection('events')

  const [
    verifications,
    bankVerifications,
    payoutReview,
    disbursements,
    withdrawals,
    disputes,
    pendingEvents,
    reportedEvents,
  ] = await Promise.all([
    statFor(
      () =>
        adminDb
          .collection('verification_requests')
          .where('status', 'in', ['pending_review', 'in_review', 'pending']),
      'createdAt'
    ),
    statFor(
      () =>
        adminDb
          .collectionGroup('verificationDocuments')
          .where('type', '==', 'bank')
          .where('status', '==', 'pending'),
      'submittedAt'
    ),
    statFor(() => adminDb.collection('payout_review_queue').where('status', '==', 'pending'), 'createdAt'),
    statFor(
      () => adminDb.collectionGroup('payouts').where('status', 'in', ['pending', 'approved']),
      'createdAt'
    ),
    statFor(() => adminDb.collection('withdrawal_requests').where('status', '==', 'pending'), 'createdAt'),
    statFor(() => adminDb.collection('disputes').where('status', '==', 'open'), 'updatedAt'),
    statFor(() => events().where('is_published', '==', false).where('rejected', '==', false), 'created_at'),
    statFor(() => events().where('reports_count', '>', 0), 'created_at'),
  ])

  return {
    verifications,
    bankVerifications,
    payoutReview,
    disbursements,
    withdrawals,
    disputes,
    pendingEvents,
    reportedEvents,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/admin-queue-summary.test.ts`
Expected: PASS, 9 tests

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning `lib/admin/queue-summary`

- [ ] **Step 6: Commit**

```bash
git add lib/admin/queue-summary.ts __tests__/admin-queue-summary.test.ts
git commit -m "Per-queue count and oldest-waiting reader, degrading per queue"
```

---

## Task 3: Queue summary endpoint

**Files:**
- Create: `app/api/admin/queues/summary/route.ts`

**Interfaces:**
- Consumes: `getQueueSummary` from Task 2.
- Produces: `GET /api/admin/queues/summary` → `{ queues: QueueSummary, timestamp: string }`, 401 when not admin.

- [ ] **Step 1: Write the route**

```ts
// app/api/admin/queues/summary/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getQueueSummary } from '@/lib/admin/queue-summary'

export const dynamic = 'force-dynamic'

/**
 * Eight queues × (one aggregation + one 1-doc read) = 16 reads per call. The
 * provider polls every 10s, so this is cached for slightly less than one poll
 * interval — concurrent admins then share one set of reads instead of each
 * paying for their own.
 */
const CACHE_MS = 9_000

let cached: { at: number; value: Awaited<ReturnType<typeof getQueueSummary>> } | null = null
let inFlight: Promise<Awaited<ReturnType<typeof getQueueSummary>>> | null = null

async function readSummary() {
  const now = Date.now()
  if (cached && now - cached.at < CACHE_MS) return cached.value
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const value = await getQueueSummary()
      cached = { at: Date.now(), value }
      return value
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

export async function GET() {
  const { user, error } = await requireAdmin()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const queues = await readSummary()
  return NextResponse.json(
    { queues, timestamp: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
```

- [ ] **Step 2: Verify it compiles and builds**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 3: Verify the route responds**

Run: `npm run dev`, then in another shell `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/queues/summary`
Expected: `401` (unauthenticated). Signed in as an admin in the browser, `/api/admin/queues/summary` returns JSON with all eight keys present.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/queues/summary/route.ts
git commit -m "Queue summary endpoint, cached to one poll interval"
```

---

## Task 4: Carry queue summaries in AdminRealtimeProvider

**Files:**
- Modify: `lib/realtime/AdminRealtimeProvider.tsx`

**Interfaces:**
- Consumes: `QueueSummary`, `RAIL_GROUPS`, `railStat` from Task 2; the endpoint from Task 3.
- Produces: `useAdminQueues(): { queues: QueueSummary | null; isConnected: boolean }`, and `queues` on `AdminRealtimeContextValue`.

The existing `useAdminPendingCount` must keep working unchanged — `AdminTopNav` still uses it until Task 18.

- [ ] **Step 1: Add queues to the context type**

In `lib/realtime/AdminRealtimeProvider.tsx`, add the import and extend the context value:

```ts
import type { QueueSummary } from '@/lib/admin/queue-summary'
```

```ts
export interface AdminRealtimeContextValue {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  data: RealtimeData | null
  metrics: AdminMetricsUpdate | null
  activities: AdminActivity[]
  systemStatus: SystemStatus | null
  queues: QueueSummary | null
  lastUpdate: Date | null
  refresh: () => Promise<void>
  addActivity: (activity: Omit<AdminActivity, 'id' | 'timestamp'>) => Promise<void>
}
```

- [ ] **Step 2: Fetch the summary alongside the existing poll**

Add `const [queues, setQueues] = useState<QueueSummary | null>(null)` beside the other state, then inside `fetchRealtimeData` replace the single fetch with both, so one poll covers both endpoints:

```ts
const [response, queuesResponse] = await Promise.all([
  fetch('/api/admin/realtime', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  }),
  // A queue-summary failure must not mark the whole connection down — the
  // metrics poll is the connection's health signal, not this.
  fetch('/api/admin/queues/summary', { cache: 'no-store' }).catch(() => null),
])

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`)
}

if (queuesResponse && queuesResponse.ok) {
  const payload = await queuesResponse.json()
  setQueues(payload.queues ?? null)
}
```

Add `queues` to the context value object passed to the provider.

- [ ] **Step 3: Add the hook**

At the bottom of the file, beside `useAdminPendingCount`:

```ts
/**
 * Per-queue counts and oldest-waiting ages for the sidebar and the Needs You
 * landing. Null until the first poll lands, and null per queue when that queue's
 * read failed — callers must render those two cases differently from zero.
 */
export function useAdminQueues() {
  const { queues, isConnected } = useAdminRealtime()
  return { queues, isConnected }
}
```

- [ ] **Step 4: Verify nothing regressed**

Run: `npx tsc --noEmit -p tsconfig.json && npx jest`
Expected: types clean, existing suite passes. `AdminTopNav` still compiles against `useAdminPendingCount`.

- [ ] **Step 5: Commit**

```bash
git add lib/realtime/AdminRealtimeProvider.tsx
git commit -m "Carry per-queue summaries on the existing admin poll"
```

---

## Task 5: AdminSidebar

**Files:**
- Create: `components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `useAdminQueues` (Task 4), `RAIL_GROUPS`/`railStat` (Task 2), `formatAge`/`ageClass` (Task 1).
- Produces: `<AdminSidebar userEmail?: string />`. It takes **no** `accountInitial` — the old `AdminTopNav` needed one for its account chip, the rail has no such chip.

- [ ] **Step 1: Write the component**

```tsx
// components/admin/AdminSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, Settings, Wrench } from 'lucide-react'
import { TikemWordmark } from '@/components/ui/TikemLogo'
import { useAdminQueues } from '@/lib/realtime/AdminRealtimeProvider'
import { RAIL_GROUPS, railStat } from '@/lib/admin/queue-summary'
import { formatAge, ageClass } from '@/lib/admin/age'

const DEV_EMAILS = ['edward.laguerre+dev@gmail.com', 'edwardlaguerre7@gmail.com']

const BROWSE = [
  { label: 'People', href: '/admin/users' },
  { label: 'Events', href: '/admin/events' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Analytics', href: '/admin/analytics' },
]

function RailLink({
  href,
  label,
  active,
  children,
}: {
  href: string
  label: string
  active: boolean
  children?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex h-9 items-center justify-between gap-2 rounded-md px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        active ? 'bg-white/[0.06] font-semibold text-brand-300' : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
      }`}
    >
      <span className="font-grotesk truncate">{label}</span>
      {children}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="label-mono px-3 pb-1.5 pt-5 text-[10px] uppercase tracking-wider text-white/40">
      {children}
    </div>
  )
}

/**
 * The admin rail. Splits QUEUES (things needing a decision) from BROWSE (things
 * you look up) — the distinction the old seven-tab bar flattened.
 *
 * Each queue shows `count · oldest`, because a count alone cannot tell twelve
 * items filed this morning from two filed last week.
 */
export function AdminSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const { queues } = useAdminQueues()

  const isDeveloper = !!userEmail && DEV_EMAILS.includes(userEmail)
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href))

  return (
    <nav
      aria-label="Admin"
      className="flex h-full w-60 shrink-0 flex-col border-r border-white/10 bg-[#0a0a0a] px-2 py-3"
    >
      <Link
        href="/admin"
        className="mb-2 flex items-center gap-2 px-3 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <TikemWordmark italic className="text-2xl text-white" />
        <span className="label-mono text-[10px] font-bold uppercase tracking-wider text-brand-300">Admin</span>
      </Link>

      <RailLink href="/admin" label="Needs you" active={isActive('/admin')} />

      <SectionLabel>Queues</SectionLabel>
      {RAIL_GROUPS.map((group) => {
        const stat = queues ? railStat(queues, group) : null
        const unreadable = queues !== null && stat === null
        return (
          <RailLink key={group.key} href={group.href} label={group.label} active={isActive(group.href)}>
            {stat && stat.count > 0 ? (
              <span className="label-mono shrink-0 text-[11px] tabular-nums">
                <span className="text-white/70">{stat.count}</span>
                {stat.oldestAt && (
                  <>
                    <span className="text-white/25"> · </span>
                    <span className={ageClass(stat.oldestAt)}>{formatAge(stat.oldestAt)}</span>
                  </>
                )}
              </span>
            ) : unreadable ? (
              // An unreadable queue must never look like a cleared one.
              <span className="label-mono shrink-0 text-[11px] text-white/25" title="Count unavailable">
                —
              </span>
            ) : null}
          </RailLink>
        )
      })}

      <SectionLabel>Browse</SectionLabel>
      {BROWSE.map((item) => (
        <RailLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
      ))}

      <div className="mt-auto border-t border-white/10 pt-2">
        <RailLink href="/admin/security" label="Security" active={isActive('/admin/security')}>
          <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </RailLink>
        <RailLink href="/admin/settings" label="Settings" active={isActive('/admin/settings')}>
          <Settings className="h-3.5 w-3.5 shrink-0 text-white/40" />
        </RailLink>
        {isDeveloper && (
          <RailLink href="/admin/dev" label="Dev" active={isActive('/admin/dev')}>
            <Wrench className="h-3.5 w-3.5 shrink-0 text-white/40" />
          </RailLink>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminSidebar.tsx
git commit -m "Admin rail: queues with count and oldest, separated from browse"
```

---

## Task 6: Swap the layout to the sidebar

**Files:**
- Modify: `app/admin/layout.tsx`

**Interfaces:**
- Consumes: `AdminSidebar` (Task 5).
- Produces: the two-column admin shell every subsequent task renders inside.

Below `md` the rail is hidden and `MobileNavWrapper` continues to carry navigation, so no admin route becomes unreachable on a phone.

**Deviation from the spec, deliberate.** The spec called for three tiers — full rail at `lg`, icon-only at `md`, drawer below. This plan ships two: full rail at `md` and up, hidden below. An icon-only rail cannot carry `count · oldest`, which is the entire point of the rail; reducing it to a bare dot at one breakpoint would make the console's organizing signal disappear on exactly the screens where scanning is hardest. Two tiers keep the signal intact at every width where the rail is shown at all. If the `md`–`lg` band later proves too tight for a 240px rail, the fix is a collapsible rail that remembers its state, not an icon strip.

- [ ] **Step 1: Replace the top nav with the rail**

In `app/admin/layout.tsx`, replace the `AdminTopNav` import with `import { AdminSidebar } from '@/components/admin/AdminSidebar'`, then replace the returned shell:

```tsx
return (
  <AdminRealtimeProvider>
    <ConfirmProvider>
      <div className="surface-dark flex min-h-screen">
        {/* The rail is sticky and full-height; below md it is hidden and
            MobileNavWrapper carries navigation instead. */}
        <div className="sticky top-0 hidden h-screen md:block">
          <AdminSidebar userEmail={user.email} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminCommandBar />
          <main className="min-w-0 flex-1 pb-mobile-nav">{children}</main>
        </div>

        <MobileNavWrapper user={user} isAdmin={true} />
      </div>
    </ConfirmProvider>
  </AdminRealtimeProvider>
)
```

Leave the `accountInitial` computation in place — Task 7's `AdminPage` does not need it, and `AdminCommandBar` is unchanged.

- [ ] **Step 2: Verify the shell renders on every admin route**

Run: `npm run dev`, then visit `/admin`, `/admin/users`, `/admin/verify`, `/admin/events`, `/admin/settings` signed in as an admin.
Expected: the rail is present on all five, the active entry is highlighted, queue counts appear within ~10s, and no route 500s.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "Admin shell is a persistent rail, not a seven-tab bar"
```

---

## Task 7: AdminPage shell

**Files:**
- Create: `components/admin/AdminPage.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<AdminPage title description? action? children />`.

This is the one serif moment per page — every admin route's header goes through it, so the rule is enforced by construction rather than by review.

- [ ] **Step 1: Write the component**

```tsx
// components/admin/AdminPage.tsx
import type { ReactNode } from 'react'

/**
 * Every admin page's header and padding. The title is the console's single
 * Instrument Serif moment — routing all pages through here is what keeps it to
 * one per page.
 */
export function AdminPage({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(22px,3vw,30px)] leading-[1.06] text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-white/70">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminPage.tsx
git commit -m "Shared admin page shell with the single serif title"
```

---

## Task 8: QueueTable

**Files:**
- Create: `components/admin/QueueTable.tsx`

**Interfaces:**
- Consumes: `formatAge`, `ageClass` (Task 1).
- Produces:
  - `type QueueColumn<T> = { key: string; header: string; className?: string; render: (row: T) => ReactNode }`
  - `<QueueTable<T> rows columns getKey getAgeAt? actionLabel? onAction? emptyMessage loading? />`

Tasks 10–17 consume this exact signature. `getAgeAt` returning `undefined` omits the age column entirely, which is how the Register archetype reuses the same table.

- [ ] **Step 1: Write the component**

```tsx
// components/admin/QueueTable.tsx
'use client'

import type { ReactNode } from 'react'
import { formatAge, ageClass } from '@/lib/admin/age'

export type QueueColumn<T> = {
  key: string
  header: string
  /** Applied to both the header cell and the body cell so they stay aligned. */
  className?: string
  render: (row: T) => ReactNode
}

/**
 * The one table every admin queue and register renders through: 44px rows, and
 * an age column when the rows have an age worth showing.
 *
 * State is never a filled pill — callers render a dot plus a label in their own
 * column (existing product rule).
 */
export function QueueTable<T>({
  rows,
  columns,
  getKey,
  getAgeAt,
  actionLabel,
  onAction,
  emptyMessage,
  loading = false,
}: {
  rows: T[]
  columns: QueueColumn<T>[]
  getKey: (row: T) => string
  /** Omit to drop the age column — that is the Register archetype. */
  getAgeAt?: (row: T) => string | null | undefined
  actionLabel?: string
  onAction?: (row: T) => void
  emptyMessage: string
  loading?: boolean
}) {
  const showAge = typeof getAgeAt === 'function'
  const showAction = typeof onAction === 'function' && !!actionLabel

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex h-11 items-center gap-4 border-b border-white/[0.06] px-4 last:border-0">
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 px-4 py-12 text-center text-sm text-white/50">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`font-grotesk px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/45 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
            {showAge && (
              <th scope="col" className="font-grotesk px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-white/45">
                Waiting
              </th>
            )}
            {showAction && <th scope="col" className="px-4 py-2.5"><span className="sr-only">Action</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const ageAt = showAge ? getAgeAt!(row) : null
            return (
              <tr key={getKey(row)} className="h-11 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 text-sm text-white ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
                {showAge && (
                  <td className={`label-mono px-4 text-right text-[13px] tabular-nums ${ageClass(ageAt)}`}>
                    {formatAge(ageAt)}
                  </td>
                )}
                {showAction && (
                  <td className="px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onAction!(row)}
                      className="font-grotesk rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      {actionLabel}
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Write a rendering test**

```tsx
// __tests__/admin-queue-table.test.tsx
import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { QueueTable } from '../components/admin/QueueTable'

type Row = { id: string; name: string; createdAt: string }
const rows: Row[] = [{ id: 'a', name: 'Ayiti Events', createdAt: new Date().toISOString() }]
const columns = [{ key: 'name', header: 'Name', render: (r: Row) => r.name }]

describe('QueueTable', () => {
  it('renders the empty message instead of an empty table', () => {
    render(<QueueTable rows={[]} columns={columns} getKey={(r) => r.id} emptyMessage="Nothing waiting" />)
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument()
  })

  it('shows the Waiting column only when getAgeAt is supplied', () => {
    const { rerender } = render(
      <QueueTable rows={rows} columns={columns} getKey={(r) => r.id} emptyMessage="none" />
    )
    expect(screen.queryByText('Waiting')).toBeNull()

    rerender(
      <QueueTable
        rows={rows}
        columns={columns}
        getKey={(r) => r.id}
        getAgeAt={(r) => r.createdAt}
        emptyMessage="none"
      />
    )
    expect(screen.getByText('Waiting')).toBeInTheDocument()
    expect(screen.getByText('0m')).toBeInTheDocument()
  })

  it('renders the action button only when both label and handler are given', () => {
    render(
      <QueueTable
        rows={rows}
        columns={columns}
        getKey={(r) => r.id}
        actionLabel="Review"
        onAction={() => {}}
        emptyMessage="none"
      />
    )
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test**

Run: `npx jest __tests__/admin-queue-table.test.tsx`
Expected: PASS, 3 tests

- [ ] **Step 4: Commit**

```bash
git add components/admin/QueueTable.tsx __tests__/admin-queue-table.test.tsx
git commit -m "Shared 44px admin table with the age column"
```

---

## Task 9: "Needs you" landing

**Files:**
- Create: `lib/admin/needs-you.ts`, `__tests__/admin-needs-you.test.ts`
- Modify: `app/admin/page.tsx`, `app/admin/AdminDashboardClient.tsx`

**Interfaces:**
- Consumes: `QueueKey` (Task 2), `AdminPage` (Task 7), `QueueTable` (Task 8).
- Produces: `type NeedsYouItem = { id: string; queue: QueueKey; subject: string; decision: string; href: string; createdAt: string | null }`, `mergeNeedsYou(groups: NeedsYouItem[][]): NeedsYouItem[]`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/admin-needs-you.test.ts
import { describe, it, expect } from '@jest/globals'
import { mergeNeedsYou } from '../lib/admin/needs-you'
import type { NeedsYouItem } from '../lib/admin/needs-you'

const item = (id: string, createdAt: string | null): NeedsYouItem => ({
  id,
  queue: 'verifications',
  subject: id,
  decision: 'ID verification',
  href: `/admin/verify#${id}`,
  createdAt,
})

describe('mergeNeedsYou', () => {
  it('sorts oldest first across every queue', () => {
    const merged = mergeNeedsYou([
      [item('b', '2026-08-13T00:00:00.000Z')],
      [item('a', '2026-08-08T00:00:00.000Z'), item('c', '2026-08-14T00:00:00.000Z')],
    ])
    expect(merged.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('puts items with no timestamp last rather than first', () => {
    const merged = mergeNeedsYou([[item('x', null), item('y', '2026-08-10T00:00:00.000Z')]])
    expect(merged.map((i) => i.id)).toEqual(['y', 'x'])
  })

  it('drops duplicate ids so one item cannot appear twice', () => {
    const merged = mergeNeedsYou([[item('a', '2026-08-10T00:00:00.000Z')], [item('a', '2026-08-10T00:00:00.000Z')]])
    expect(merged).toHaveLength(1)
  })

  it('returns an empty list when every queue is empty', () => {
    expect(mergeNeedsYou([[], []])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/admin-needs-you.test.ts`
Expected: FAIL — `Cannot find module '../lib/admin/needs-you'`

- [ ] **Step 3: Write the merge**

```ts
// lib/admin/needs-you.ts
/**
 * The landing list: every queue merged into one oldest-first list, so the answer
 * to "what do I do now" is the top row. Deliberately not a dashboard — totals
 * moved to /admin/analytics, where a chart means something.
 */

import type { QueueKey } from '@/lib/admin/queue-summary'

export interface NeedsYouItem {
  id: string
  queue: QueueKey
  /** Who or what the decision is about. */
  subject: string
  /** The decision needed, in the admin's words: "ID verification", "payout review". */
  decision: string
  href: string
  createdAt: string | null
}

/**
 * Oldest first. Items without a timestamp sort last: an unknown age is not
 * evidence of urgency, and floating them to the top would bury real backlog.
 */
export function mergeNeedsYou(groups: NeedsYouItem[][]): NeedsYouItem[] {
  const seen = new Set<string>()
  const merged: NeedsYouItem[] = []

  for (const group of groups) {
    for (const item of group) {
      const key = `${item.queue}:${item.id}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
    }
  }

  return merged.sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return a.createdAt.localeCompare(b.createdAt)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/admin-needs-you.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Write the landing data reader**

```ts
// lib/admin/needs-you-data.ts
import { adminDb } from '@/lib/firebase/admin'
import { mergeNeedsYou, type NeedsYouItem } from '@/lib/admin/needs-you'

/** Cap per queue: the landing is a triage list, not a full backlog export. */
const PER_QUEUE = 25

function toIso(value: any): string | null {
  if (!value) return null
  if (typeof value?.toDate === 'function') {
    const d = value.toDate()
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : value
  }
  return null
}

/**
 * One queue's oldest items as landing rows. Returns [] on failure for the same
 * reason getQueueSummary returns null per queue: one cold index must not empty
 * the whole landing.
 */
async function readQueue(
  build: () => FirebaseFirestore.Query,
  ageField: string,
  toItem: (id: string, data: any, createdAt: string | null) => NeedsYouItem
): Promise<NeedsYouItem[]> {
  try {
    const snap = await build().orderBy(ageField, 'asc').limit(PER_QUEUE).get()
    return snap.docs.map((doc: any) => toItem(doc.id, doc.data() || {}, toIso(doc.data()?.[ageField])))
  } catch (error) {
    console.warn('[admin/needs-you] queue read failed', error)
    return []
  }
}

export async function getNeedsYouItems(): Promise<NeedsYouItem[]> {
  const events = () => adminDb.collection('events')

  const groups = await Promise.all([
    readQueue(
      () =>
        adminDb
          .collection('verification_requests')
          .where('status', 'in', ['pending_review', 'in_review', 'pending']),
      'createdAt',
      (id, d, createdAt) => ({
        id,
        queue: 'verifications',
        subject: d.businessName || d.full_name || d.email || 'Unknown organizer',
        decision: 'ID verification',
        href: '/admin/verify',
        createdAt,
      })
    ),
    readQueue(
      () =>
        adminDb
          .collectionGroup('verificationDocuments')
          .where('type', '==', 'bank')
          .where('status', '==', 'pending'),
      'submittedAt',
      (id, d, createdAt) => ({
        id,
        queue: 'bankVerifications',
        subject: d.accountName || d.bankName || 'Bank account',
        decision: 'bank verification',
        href: '/admin/bank-verifications',
        createdAt,
      })
    ),
    readQueue(
      () => adminDb.collection('payout_review_queue').where('status', '==', 'pending'),
      'createdAt',
      (id, d, createdAt) => ({
        id,
        queue: 'payoutReview',
        subject: d.organizerName || d.organizerId || 'Payout',
        decision: 'payout review',
        href: '/admin/payouts/review',
        createdAt,
      })
    ),
    readQueue(
      () => adminDb.collectionGroup('payouts').where('status', 'in', ['pending', 'approved']),
      'createdAt',
      (id, d, createdAt) => ({
        id,
        queue: 'disbursements',
        subject: d.organizerName || d.organizerId || 'Disbursement',
        decision: 'disbursement',
        href: '/admin/disbursements',
        createdAt,
      })
    ),
    readQueue(
      () => adminDb.collection('withdrawal_requests').where('status', '==', 'pending'),
      'createdAt',
      (id, d, createdAt) => ({
        id,
        queue: 'withdrawals',
        subject: d.organizerName || d.organizerId || 'Withdrawal',
        decision: 'withdrawal',
        href: '/admin/withdrawals',
        createdAt,
      })
    ),
    readQueue(
      () => adminDb.collection('disputes').where('status', '==', 'open'),
      'updatedAt',
      (id, d, createdAt) => ({
        id,
        queue: 'disputes',
        subject: d.subject || d.orderId || 'Dispute',
        decision: 'dispute',
        href: '/admin/disputes',
        createdAt,
      })
    ),
    readQueue(
      () => events().where('is_published', '==', false).where('rejected', '==', false),
      'created_at',
      (id, d, createdAt) => ({
        id,
        queue: 'pendingEvents',
        subject: d.title || 'Untitled event',
        decision: 'event approval',
        href: '/admin/events',
        createdAt,
      })
    ),
    readQueue(
      () => events().where('reports_count', '>', 0),
      'created_at',
      (id, d, createdAt) => ({
        id,
        queue: 'reportedEvents',
        subject: d.title || 'Untitled event',
        decision: `reported ×${d.reports_count ?? 1}`,
        href: '/admin/events',
        createdAt,
      })
    ),
  ])

  return mergeNeedsYou(groups)
}
```

Note the `reportedEvents` query: Firestore requires the first `orderBy` to match an inequality's field, so `where('reports_count','>',0).orderBy('created_at')` is invalid. Order that one by `reports_count` instead and let `mergeNeedsYou` do the age sort:

```ts
// In readQueue's caller for reportedEvents only, pass 'reports_count' as the
// orderBy field but read the age from created_at:
const snap = await events().where('reports_count', '>', 0).orderBy('reports_count', 'desc').limit(PER_QUEUE).get()
```

Apply the same correction in `lib/admin/queue-summary.ts`'s `reportedEvents` entry — its `orderBy(ageField)` hits the identical constraint. There, read the count from the aggregation and set `oldestAt` from the oldest `created_at` among the returned docs rather than from a 1-doc ordered read.

- [ ] **Step 6: Rewrite the landing page**

`app/admin/page.tsx` calls `getNeedsYouItems()` and renders:

```tsx
<AdminPage title="Needs you" description={`${items.length} waiting`}>
  <QueueTable
    rows={items}
    columns={[
      { key: 'subject', header: 'Subject', render: (i) => <span className="font-medium">{i.subject}</span> },
      { key: 'decision', header: 'Decision', className: 'text-white/70', render: (i) => i.decision },
    ]}
    getKey={(i) => `${i.queue}:${i.id}`}
    getAgeAt={(i) => i.createdAt}
    actionLabel="Open"
    onAction={(i) => router.push(i.href)}
    emptyMessage="Nothing waiting. Every queue is clear."
  />
  <ClearedToday />
</AdminPage>
```

`ClearedToday` reads `getRecentAdminActivities` from `lib/admin/audit-log.ts` (which already records `adminId`, `adminEmail`, `adminName`, `action`, `timestamp`), filters to today, and renders one line: `Cleared today — {n} · by {name} {n}, …`. No new writes.

Delete the stat strip and `WorkQueueCard` usage from `AdminDashboardClient.tsx`.

- [ ] **Step 7: Verify**

Run: `npx jest && npx tsc --noEmit -p tsconfig.json && npm run build`
Expected: all pass. Visiting `/admin` shows one oldest-first list and no chart.

Also confirm in the browser that reported events actually appear in the list — that is the query the inequality/orderBy correction in Step 5 affects, and a silent empty result is exactly how getting it wrong would look.

- [ ] **Step 8: Commit**

```bash
git add lib/admin/needs-you.ts lib/admin/needs-you-data.ts lib/admin/queue-summary.ts __tests__/admin-needs-you.test.ts app/admin/page.tsx app/admin/AdminDashboardClient.tsx
git commit -m "Admin landing is one oldest-first list, not a board of totals"
```

---

## Tasks 10–17: Queue and register migrations

Each task has the same five steps — read the route, replace its header with `AdminPage`, replace its list with `QueueTable` using the columns below, verify, commit. The columns and action differ per route and are given in full.

Every migration keeps its existing API route and action semantics. **No task in this group changes queue behaviour.**

Per-task steps:

- [ ] **Step 1:** Read the route's current client component and note the exact fields it already has in scope.
- [ ] **Step 2:** Wrap the page body in `<AdminPage title={...} description={...}>`, deleting the hand-rolled header.
- [ ] **Step 3:** Replace the list markup with `<QueueTable>` using this task's columns. Keep the existing action handler — pass it as `onAction`.
- [ ] **Step 4:** Run `npx tsc --noEmit -p tsconfig.json`, then load the route in `npm run dev` and confirm rows, ages and the action all work.
- [ ] **Step 5:** Commit with `git commit -m "Route <name> through the shared admin table"`.

### Task 10: `/admin/verify` — `app/admin/verify/VerificationsHub.tsx`

Title `Verifications`. Age from `createdAt`. Action `Review`.
Columns: Organizer (`businessName || full_name || email`) · Type (`idType || 'ID'`) · Submitted (`label-mono`, `formatAge`-independent date).

### Task 11: `/admin/bank-verifications` — `app/admin/bank-verifications/BankVerificationsClient.tsx`

Title `Bank verifications`. Age from `submittedAt`. Action `Review`.
Columns: Organizer · Bank (`bankName`) · Account (`••••{accountNumberLast4}`, `label-mono`).

### Task 12: `/admin/payouts/review` — `app/admin/payouts/review/PayoutReviewQueue.tsx`

Title `Payout review`. Age from `createdAt`. Action `Review`.
Columns: Organizer · Amount (`label-mono tabular-nums`, currency + amount) · Reason (`text-white/70`).

### Task 13: `/admin/disbursements` — `app/admin/disbursements/page.tsx`

Title `Disbursements`. Age from `createdAt`. Action `Open`.
Columns: Organizer · Amount (`label-mono tabular-nums`) · State (dot + label: `pending` amber, `approved` teal — **not** a filled pill).

### Task 14: `/admin/withdrawals` — `app/admin/withdrawals/WithdrawalsView.tsx`

Title `Withdrawals`. Age from `createdAt`. Action `Review`.
Columns: Organizer · Amount (`label-mono tabular-nums`) · Method.

### Task 15: `/admin/disputes` — `app/admin/disputes/DisputesLog.tsx`

Title `Disputes`. Age from `updatedAt`. Action `Open`.
Columns: Subject · Reason · State (dot + label: `open` amber, `closed` white/45).

### Task 16: `/admin/events` — `app/admin/events/AdminEventsModerationConsole.tsx`

Title `Events`. Keep the existing tab bar and `AdminEventDetailSheet` — only the table changes. Age from `created_at`, shown on the `pending` and `reported` tabs only (pass `getAgeAt={undefined}` on `published`).
Columns: Event · Organizer · City · Reports (`label-mono`, hidden unless `> 0`).

### Task 17: Registers — `/admin/users`, `/admin/organizers`, `/admin/orders`

Title `People` / `Organizers` / `Orders`. **No `getAgeAt`** — these are registers, not queues. Keep each page's existing search and filter controls, moved into a sticky subheader above the table.
Columns (users/organizers): Name · Email · Role · State (dot + label). Columns (orders): Order (`label-mono` id) · Buyer · Event · Amount (`label-mono tabular-nums`).

Commit each of the three routes separately — they share a shape but fail independently, and a reviewer should be able to reject one without the others.

---

## Task 18: Detail archetype

**Files:**
- Modify: `app/admin/organizers/[id]/OrganizerDetailsClient.tsx`, `app/admin/users/[id]/AdminUserDetailsClient.tsx`

The Detail archetype is identity header, then evidence. `OrganizerDetailsClient` is already close to this — its events list (added 2026-08-14) is the evidence pattern the user detail should match.

- [ ] **Step 1:** Wrap both pages' bodies in `<AdminPage title={name} description={email}>`, deleting the hand-rolled `<h1>` in each. The quick-action buttons become `AdminPage`'s `action` slot.
- [ ] **Step 2:** In `OrganizerDetailsClient`, convert the events list to `QueueTable` with columns Event · Date · Place · Sold (`label-mono tabular-nums`) · State (dot + label), `getKey={(e) => e.id}` and **no** `getAgeAt` — a detail page's events are a register, not a queue.
- [ ] **Step 3:** In `AdminUserDetailsClient`, add the equivalent tickets/orders evidence table using `QueueTable`, no `getAgeAt`.
- [ ] **Step 4:** Confirm neither page renders a filled status pill; convert any that remain to dot + label.
- [ ] **Step 5:** Run `npx tsc --noEmit -p tsconfig.json`, load both routes, then commit:

```bash
git commit -m "Route the admin detail pages through the shared shell and table"
```

---

## Task 19: Config and Insight archetypes

**Files:**
- Modify: `app/admin/settings/PlatformSettingsForm.tsx`, `app/admin/payouts/release-settings/PayoutReleaseSettingsForm.tsx`, `app/admin/analytics/page.tsx`, `app/admin/security/SecurityDashboardClient.tsx`

Insight keeps its charts — only the header and padding change, so these routes stop carrying their own bespoke page chrome.

- [ ] **Step 1:** Wrap all four in `<AdminPage title={...} description={...}>`, deleting each page's hand-rolled header.
- [ ] **Step 2:** Constrain the two Config pages' form bodies to a single narrow column (`max-w-2xl`) with labelled rows and an explicit save button. Do not change any form field, validation rule, or submit handler.
- [ ] **Step 3:** Leave every chart in `analytics` and `security` exactly as it is — the spec puts chart content out of scope.
- [ ] **Step 4:** Run `npx tsc --noEmit -p tsconfig.json`, load all four routes, confirm each saves correctly, then commit:

```bash
git commit -m "Route admin config and insight pages through the shared shell"
```

---

## Task 20: Remove the replaced components

**Files:**
- Delete: `components/admin/AdminTopNav.tsx`, `components/admin/WorkQueueCard.tsx`

Do this **last**: until every route is migrated (Tasks 10–19), a rollback of any single migration task may still need them.

- [ ] **Step 1: Confirm nothing imports them**

Run: `grep -rn "AdminTopNav\|WorkQueueCard" --include="*.tsx" --include="*.ts" app components lib`
Expected: no output. If there is output, that route was missed — migrate it before continuing.

- [ ] **Step 2: Delete**

```bash
git rm components/admin/AdminTopNav.tsx components/admin/WorkQueueCard.tsx
```

- [ ] **Step 3: Verify the build**

Run: `npx tsc --noEmit -p tsconfig.json && npx jest && npm run build`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove the admin top nav and work-queue cards the rail replaced"
```

---

## Task 21: Full-console verification

- [ ] **Step 1: Walk every route signed in as an admin**

Visit all of: `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/organizers`, `/admin/organizers/[id]`, `/admin/verify`, `/admin/bank-verifications`, `/admin/events`, `/admin/orders`, `/admin/disbursements`, `/admin/payouts`, `/admin/payouts/review`, `/admin/payouts/release-settings`, `/admin/withdrawals`, `/admin/disputes`, `/admin/analytics`, `/admin/security`, `/admin/settings`.

For each, confirm against the spec's success criteria: the rail is present with the active entry lit, there is exactly one serif title, every age/amount/ID is in tabular mono, rows are 44px, and there is not a single filled status pill.

- [ ] **Step 2: Check the two states that are easy to get wrong**

- Break one queue deliberately (temporarily rename a collection string in `lib/admin/queue-summary.ts`) and confirm the rail shows `—` for that entry, **not** a zero, and that the other entries still render. Revert the change.
- With every queue empty, confirm `/admin` shows "Nothing waiting. Every queue is clear." rather than a blank panel.

- [ ] **Step 3: Check mobile**

At 390px wide, confirm the rail is hidden, `MobileNavWrapper` still reaches every admin route, and queue tables scroll horizontally inside their own container without the page body scrolling sideways.

- [ ] **Step 4: Commit any fixes**

```bash
git commit -m "Fixes from the full admin console walkthrough"
```
