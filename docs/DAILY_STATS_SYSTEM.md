# Daily Statistics Rollup System

## Overview

The Eventica platform uses a daily rollup system to efficiently track platform metrics without querying all tickets every time. Stats are pre-calculated daily and stored in the `platform_stats_daily` Firestore collection.

## Architecture

### Daily Rollup Process

Every day at 1:00 AM UTC, the system:
1. Queries all **confirmed** tickets purchased yesterday
2. Calculates GMV (Gross Merchandise Value) from confirmed sales
3. Counts confirmed tickets
4. Tracks refunds (count and amount)
5. Stores results in `platform_stats_daily/{YYYY-MM-DD}`

### Collection Structure

**Collection:** `platform_stats_daily`  
**Document ID:** Date in `YYYY-MM-DD` format (e.g., `2025-11-30`)

```typescript
{
  date: "2025-11-30",
  gmvConfirmed: 15000,      // Total HTG from confirmed tickets
  ticketsConfirmed: 45,      // Count of confirmed tickets
  refundsCount: 2,           // Number of refunds
  refundsAmount: 1000,       // Total HTG refunded
  updatedAt: Timestamp
}
```

## Setup

### 1. Vercel Cron Job

The daily stats cron is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-stats",
      "schedule": "0 1 * * *"
    }
  ]
}
```

This runs daily at 1:00 AM UTC.

### 2. Secure the Endpoint

Add a cron secret to your environment variables:

```bash
# In Vercel dashboard or .env.local
CRON_SECRET=your-random-secret-here
```

The endpoint will verify this secret to prevent unauthorized access.

### 3. Backfill Historical Data

To populate stats for past dates:

```bash
# Backfill last 7 days (default)
npm run backfill-stats

# Backfill last 30 days
npm run backfill-stats:30

# Backfill custom number of days
node scripts/backfill-daily-stats.js 60
```

**Important:** Make sure `FIREBASE_SERVICE_ACCOUNT_KEY` is set in your environment before running backfill scripts.

## Usage

### Admin Dashboard

The admin dashboard automatically displays 7-day metrics:

```typescript
const { gmv7d, tickets7d, refunds7d, refundsAmount7d } = await get7DayMetrics()
```

Metrics shown:
- **Tickets (7d):** Total confirmed tickets in last 7 days
- **GMV (7d):** Total revenue from confirmed tickets
- **Refunds (7d):** Number of refunds with total amount

### Manual Trigger

You can manually trigger the daily stats calculation:

```bash
# Using curl with authentication
curl -X POST https://joineventica.com/api/cron/daily-stats \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Response
{
  "success": true,
  "date": "2025-11-29",
  "stats": {
    "gmvConfirmed": 15000,
    "ticketsConfirmed": 45,
    "refundsCount": 2,
    "refundsAmount": 1000
  }
}
```

## Monitoring

### Check Daily Stats

View stats in Firestore Console:
1. Go to Firebase Console → Firestore Database
2. Open `platform_stats_daily` collection
3. Check for recent date documents

### Verify Cron Execution

In Vercel:
1. Go to your project → Deployments
2. Click on a deployment → Functions
3. Check `/api/cron/daily-stats` logs

### Debugging

If metrics show 0:
1. Check if `platform_stats_daily` collection exists
2. Verify cron job is running (check Vercel logs)
3. Run backfill script to populate historical data
4. Ensure ticket documents have `purchased_at` and `status` fields

## Performance

### Why Rollups?

Instead of querying 100,000+ tickets every page load:
- ✅ Query 7 documents (one per day)
- ✅ Sub-100ms response time
- ✅ Consistent performance as data grows
- ✅ Firestore read cost: ~7 reads vs 100,000+ reads

### Scalability

The rollup system scales efficiently:
- **1 year of data:** 365 documents to query all metrics
- **10 years of data:** 3,650 documents
- **Per dashboard load:** Only 7 documents queried

## Troubleshooting

### "Metrics showing 0"
- Run `npm run backfill-stats` to populate data
- Check Firestore for `platform_stats_daily` collection
- Verify cron job executed successfully

### "Permission denied" errors
- Ensure Firebase service account has Firestore write permissions
- Check `FIREBASE_SERVICE_ACCOUNT_KEY` is valid

### "Cron not running"
- Verify `CRON_SECRET` environment variable is set
- Check Vercel cron configuration in project settings
- Review function logs in Vercel dashboard

## Future Enhancements

Potential improvements:
- [ ] Add hourly granularity for real-time metrics
- [ ] Track metrics by event category
- [ ] Add revenue per organizer rollups
- [ ] Create weekly/monthly aggregate views
- [ ] Add charts and trend visualization
- [ ] Email daily stats summary to admins

## Related Files

- `/app/api/cron/daily-stats/route.ts` - Cron endpoint
- `/scripts/backfill-daily-stats.js` - Backfill script
- `/lib/firestore/admin.ts` - `get7DayMetrics()` function
- `/app/admin/page.tsx` - Admin dashboard display
- `/vercel.json` - Cron job configuration
