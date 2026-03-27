# ⚡ Eventica Performance Optimization Plan
## Goal: Make the app feel instant and blazing fast

---

## 🎯 **Phase 1: Critical Path Optimizations** (Biggest Impact)

### 1.1 Image Optimization & Lazy Loading
**Current Issues:**
- Event cards load images eagerly
- No blur placeholders for smooth transitions
- Missing responsive image sizes
- Large banner images slow down initial render

**Solutions:**
```typescript
// Add to EventCard.tsx and EventCardHorizontal.tsx
<Image
  src={event.banner_image_url}
  alt={event.title}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
  priority={index < 3} // Only first 3 images
  loading={index < 3 ? "eager" : "lazy"}
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,..." // Generate blur hash
/>
```

**Impact:** 40-60% faster perceived load time for image-heavy pages
**Effort:** 2-3 hours

---

### 1.2 Route Prefetching & Preloading
**Current Issues:**
- Links don't prefetch on hover
- No preconnect to Firebase/Supabase
- Critical API calls happen after page load

**Solutions:**
```tsx
// Add to root layout.tsx
<head>
  <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
  <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
  <link rel="preconnect" href="https://api.stripe.com" />
</head>

// EventCard links with prefetch
<Link href={`/events/${event.id}`} prefetch={true}>

// Critical data preloading
export async function generateMetadata({ params }) {
  // This runs in parallel with page component
}
```

**Impact:** 200-500ms faster navigation
**Effort:** 1 hour

---

### 1.3 Parallel Data Fetching
**Current Issues:**
- Sequential database queries
- No request deduplication
- Waterfall loading patterns

**Current Problem:**
```typescript
const user = await getCurrentUser() // Wait
const events = await getEvents()     // Wait
const tickets = await getTickets()   // Wait
```

**Solution:**
```typescript
const [user, events, tickets] = await Promise.all([
  getCurrentUser(),
  getEvents(),
  getTickets()
])
```

**Pages to optimize:**
- `/dashboard/page.tsx` - Tickets + Events + Favorites in parallel
- `/tickets/page.tsx` - All ticket queries
- `/admin/page.tsx` - Stats + Users + Events
- `/organizer/analytics/page.tsx` - All analytics queries

**Impact:** 50-70% faster data loading
**Effort:** 3-4 hours

---

### 1.4 Streaming & Suspense Boundaries
**Current Issues:**
- Entire pages wait for all data
- No progressive rendering
- Large components block paint

**Solution:**
```tsx
// Break dashboard into streams
export default async function DashboardPage() {
  const user = await getCurrentUser() // Critical, load first
  
  return (
    <>
      <Navbar user={user} />
      
      {/* Stream non-critical sections */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards userId={user.id} />
      </Suspense>
      
      <Suspense fallback={<TicketsListSkeleton />}>
        <TicketsList userId={user.id} />
      </Suspense>
      
      <Suspense fallback={<UpcomingEventsSkeleton />}>
        <UpcomingEvents />
      </Suspense>
    </>
  )
}
```

**Pages to optimize:**
- `/` (homepage) - Stream categories, trending, featured separately
- `/dashboard` - Already partially done, enhance it
- `/tickets` - Stream ticket groups
- `/organizer/*` - Stream analytics

**Impact:** Page becomes interactive 60-80% faster
**Effort:** 4-5 hours

---

## 🚀 **Phase 2: Smart Caching Strategy**

### 2.1 React Server Component Caching
**Current Issues:**
- `revalidate = 0` everywhere (no caching!)
- Homepage forces fresh data every time
- Admin pages never cache

**Solution:**
```typescript
// Homepage - cache for 2 minutes
export const revalidate = 120 // ✅ Already done

// Event details - cache for 5 minutes
export const revalidate = 300

// User dashboard - cache for 30 seconds
export const revalidate = 30

// Admin pages - cache for 60 seconds
export const revalidate = 60

// Static pages - cache for 1 hour
export const revalidate = 3600
```

**Impact:** 80-90% faster repeat visits
**Effort:** 1 hour

---

### 2.2 API Route Caching
**Current Issues:**
- Every API call hits database
- No Redis/memory cache
- Expensive queries run repeatedly

**Solution:**
```typescript
// lib/cache.ts - Simple in-memory cache
const cache = new Map<string, { data: any; expires: number }>()

export function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  const now = Date.now()
  const cached = cache.get(key)
  
  if (cached && cached.expires > now) {
    return Promise.resolve(cached.data)
  }
  
  return fn().then(data => {
    cache.set(key, { data, expires: now + ttlSeconds * 1000 })
    return data
  })
}

// Usage in API routes
export async function GET() {
  return cached('trending-events', async () => {
    return await db.query(...)
  }, 120) // Cache for 2 minutes
}
```

**Impact:** 95% faster API responses for cached data
**Effort:** 2-3 hours

---

### 2.3 Client-Side SWR/React Query
**Current Issues:**
- Client components refetch on every mount
- No background revalidation
- Manual loading states everywhere

**Solution:**
```typescript
// Install SWR
npm install swr

// lib/hooks/useEvents.ts
import useSWR from 'swr'

export function useEvents() {
  const { data, error, isLoading } = useSWR(
    '/api/events',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30s
    }
  )
  
  return { events: data, isLoading, error }
}
```

**Impact:** Instant client-side navigation, optimistic updates
**Effort:** 3-4 hours

---

## ⚡ **Phase 3: Code Splitting & Bundle Size**

### 3.1 Dynamic Imports for Heavy Components
**Current Issues:**
- QR code scanner loads on every page
- Payment components in main bundle
- All icons load upfront

**Solution:**
```typescript
// Lazy load scanner
const TicketScanner = dynamic(
  () => import('@/components/TicketScanner'),
  { ssr: false, loading: () => <ScannerSkeleton /> }
)

// Lazy load payment
const StripePayment = dynamic(
  () => import('@/components/StripePayment'),
  { loading: () => <PaymentSkeleton /> }
)

// Lazy load charts
const Analytics = dynamic(
  () => import('@/components/Analytics'),
  { loading: () => <ChartsSkeleton /> }
)
```

**Components to split:**
- QR Scanner (large deps)
- Stripe Payment (heavy SDK)
- Analytics/Charts
- Rich text editors
- Image upload/crop
- Camera components

**Impact:** 30-40% smaller initial bundle
**Effort:** 2 hours

---

### 3.2 Icon Optimization
**Current Issues:**
- Importing entire lucide-react library
- Unused icons in bundle

**Solution:**
```typescript
// Before (loads all icons)
import { Calendar, Users, Ticket } from 'lucide-react'

// After (tree-shakeable)
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Users from 'lucide-react/dist/esm/icons/users'
import Ticket from 'lucide-react/dist/esm/icons/ticket'
```

Or use `next.config.js`:
```javascript
experimental: {
  optimizePackageImports: ['lucide-react']
}
```

**Impact:** 50-100KB smaller bundle
**Effort:** 30 minutes

---

### 3.3 Webpack Bundle Analyzer
**Action:** Identify and eliminate bloat

```bash
npm install @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
```

```bash
ANALYZE=true npm run build
```

**Impact:** Find hidden 100KB+ dependencies
**Effort:** 1 hour analysis

---

## 🎨 **Phase 4: UI/UX Performance Tricks**

### 4.1 Optimistic UI Updates
**Current Issues:**
- Every action waits for server
- Favorite button lags
- Ticket purchase feels slow

**Solution:**
```typescript
// Optimistic favorite
async function toggleFavorite() {
  // Update UI immediately
  setIsFavorited(!isFavorited)
  setCount(count + (isFavorited ? -1 : 1))
  
  try {
    await fetch('/api/favorites', { method: 'POST' })
  } catch (error) {
    // Rollback on error
    setIsFavorited(isFavorited)
    setCount(count)
    toast.error('Failed to update')
  }
}
```

**Impact:** Instant feedback, feels 10x faster
**Effort:** 2-3 hours

---

### 4.2 Skeleton Screens Everywhere
**Current Issues:**
- Generic loading spinners
- Layout shifts during load
- No content placeholders

**Solution:**
Create component-specific skeletons:
- `EventCardSkeleton` ✅ Already exists
- `TicketCardSkeleton` (NEW)
- `DashboardStatsSkeleton` (NEW)
- `NavigationSkeleton` (NEW)

**Impact:** Perceived performance +50%
**Effort:** 2 hours

---

### 4.3 Virtualization for Long Lists
**Current Issues:**
- Rendering 100+ event cards at once
- Admin tables with 500+ rows
- All DOM nodes created upfront

**Solution:**
```typescript
import { VirtualList } from 'react-window'

<VirtualList
  height={600}
  itemCount={events.length}
  itemSize={350}
>
  {({ index, style }) => (
    <div style={style}>
      <EventCard event={events[index]} />
    </div>
  )}
</VirtualList>
```

**Pages to virtualize:**
- `/discover` with 100+ events
- `/admin/users` table
- `/tickets` with many tickets
- `/organizer/analytics` logs

**Impact:** 70% faster with 100+ items
**Effort:** 3-4 hours

---

## 🔧 **Phase 5: Backend & Database**

### 5.1 Database Query Optimization
**Current Issues:**
- Full table scans
- No composite indexes
- N+1 queries

**Solution:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_events_published ON events(is_published, event_date);
CREATE INDEX idx_tickets_user ON tickets(user_id, created_at);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- Composite index for filtered searches
CREATE INDEX idx_events_search ON events(category, location, event_date)
  WHERE is_published = true;
```

**Impact:** 80-95% faster queries
**Effort:** 1-2 hours

---

### 5.2 Connection Pooling
**Current Issues:**
- New DB connection per request
- Cold start delays
- Connection exhaustion

**Solution:**
```typescript
// lib/db-pool.ts
import { Pool } from 'pg'

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export { pool }
```

**Impact:** 50-100ms faster queries
**Effort:** 1 hour

---

### 5.3 GraphQL/tRPC for Type Safety + Batching
**Optional but powerful**

Instead of 10 REST API calls, make 1 batch request:
```typescript
const { events, tickets, favorites } = await trpc.useQueries([
  ['events.list'],
  ['tickets.mine'],
  ['favorites.list']
])
```

**Impact:** Single round-trip, type-safe
**Effort:** 8-12 hours (BIG refactor)

---

## 📊 **Phase 6: Monitoring & Metrics**

### 6.1 Web Vitals Tracking
**Solution:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**Metrics:**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1
- TTFB (Time to First Byte) < 600ms

**Impact:** Real user metrics + alerts
**Effort:** 30 minutes

---

### 6.2 Performance Budget
**Create budget.json:**
```json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        { "metric": "interactive", "budget": 3000 },
        { "metric": "first-contentful-paint", "budget": 1500 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 300 },
        { "resourceType": "total", "budget": 500 }
      ]
    }
  ]
}
```

**Impact:** Prevent regressions
**Effort:** 30 minutes

---

## 🎯 **Quick Wins (Do These First!)**

### Priority 1 (Next 2 hours):
1. ✅ Add image lazy loading + blur placeholders to EventCard
2. ✅ Enable route prefetching on all Links
3. ✅ Add preconnect headers for Firebase/Stripe
4. ✅ Increase revalidate times (stop using `revalidate = 0`)

### Priority 2 (Next 4 hours):
5. ✅ Parallelize data fetching in dashboard
6. ✅ Add Suspense boundaries to homepage
7. ✅ Dynamic import for TicketScanner
8. ✅ Add SWR for client-side data fetching

### Priority 3 (Next 8 hours):
9. ✅ Create comprehensive skeleton screens
10. ✅ Implement optimistic UI for favorites
11. ✅ Add database indexes
12. ✅ Bundle analysis + optimization

---

## 📈 **Expected Results**

### Before Optimization:
- Homepage LCP: 3-4s
- Dashboard load: 2-3s
- Time to Interactive: 4-5s
- Bundle size: 800KB+

### After Optimization:
- Homepage LCP: **1.2-1.8s** (60% faster)
- Dashboard load: **0.8-1.2s** (65% faster)
- Time to Interactive: **1.5-2.5s** (55% faster)
- Bundle size: **400-500KB** (40% smaller)

---

## 🛠️ **Implementation Order**

**Week 1: Foundation (Critical Path)**
1. Image optimization
2. Parallel data fetching
3. Route prefetching
4. Revalidation strategy

**Week 2: Caching & Splitting**
5. API caching layer
6. Code splitting
7. SWR integration
8. Bundle optimization

**Week 3: Polish & UX**
9. Optimistic updates
10. Skeleton screens
11. Virtualization
12. Database indexes

**Week 4: Monitoring**
13. Web Vitals
14. Performance budget
15. Lighthouse CI
16. Load testing

---

## 🎓 **Resources**

- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/learn-core-web-vitals/)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- [React Server Components Best Practices](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

---

**Total Estimated Effort:** 40-50 hours
**Expected Performance Gain:** 50-70% faster across all metrics
**User Experience Impact:** App will feel instant and native-like
