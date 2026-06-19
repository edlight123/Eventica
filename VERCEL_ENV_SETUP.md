# Vercel Environment Variables Setup

## Required Environment Variables for Upstash Redis

Add these to your Vercel project to enable rate limiting:

### Step 1: Get Upstash Credentials

1. Go to [https://console.upstash.com](https://console.upstash.com)
2. Sign in or create account
3. Click "Create Database"
   - Choose region closest to your users (e.g., US East for USA)
   - Select "Global" if you have worldwide users
4. Click on your database
5. Copy these values:
   - **UPSTASH_REDIS_REST_URL**: `https://your-db-name.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: `AZxxx...xxx`

### Step 2: Add to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [https://vercel.com/edlight123/tikem/settings/environment-variables](https://vercel.com)
2. Navigate to: Project → Settings → Environment Variables
3. Add these variables:

| Key | Value | Environments |
|-----|-------|--------------|
| `UPSTASH_REDIS_REST_URL` | `https://your-db.upstash.io` | Production, Preview, Development |
| `UPSTASH_REDIS_REST_TOKEN` | `AZxxx...your-token` | Production, Preview, Development |

4. Click "Save"
5. **Redeploy**: Go to Deployments → Latest → "Redeploy"

#### Option B: Via CLI

```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Login
vercel login

# Add environment variables
vercel env add UPSTASH_REDIS_REST_URL
# Paste your URL when prompted
# Select: Production, Preview, Development (use spacebar to select all)

vercel env add UPSTASH_REDIS_REST_TOKEN
# Paste your token when prompted
# Select: Production, Preview, Development

# Pull to local
vercel env pull .env.local
```

### Step 3: Verify Setup

After adding env vars and redeploying, check Vercel logs:

✅ **Success**: No rate limit warnings  
⚠️ **Warning**: `[Rate Limit] Upstash not configured, allowing request` (means env vars missing)

---

## All Required Environment Variables

Make sure these are all set in Vercel:

### Firebase (Required)
- `FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin (Required)
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

### Security (Required)
- `ENCRYPTION_KEY` (32+ characters)

### Stripe (Required)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Upstash Redis (Optional - for rate limiting)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Other
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WEB_URL`
- `NEXT_PUBLIC_DEMO_MODE` (optional)

---

## Testing Rate Limiting

### Local Testing

```bash
# 1. Copy Upstash credentials to .env.local
echo "UPSTASH_REDIS_REST_URL=https://your-db.upstash.io" >> .env.local
echo "UPSTASH_REDIS_REST_TOKEN=your-token" >> .env.local

# 2. Start dev server
pnpm dev

# 3. Test a verification endpoint (use curl or mobile app)
# After 3 attempts within an hour, you should get:
# Status: 429
# Error: "Rate limit exceeded"
```

### Production Testing

1. Deploy with env vars configured
2. Use mobile app to submit 3+ verifications quickly
3. 4th submission should be blocked with 429 error
4. Check Upstash dashboard for analytics:
   - Go to your database → Analytics
   - See total requests, blocked requests
   - See which users are hitting limits

---

## Troubleshooting

### Build Still Failing?

**Error**: `Type error: Argument of type '"admin"' is not assignable`

**Solution**: Already fixed! The commit updated `UserRole` type and `requireAuth()` function. Just redeploy.

### Rate Limiting Not Working?

**Check 1**: Environment variables set?
```bash
vercel env ls
```

**Check 2**: Variables available at runtime?
```typescript
console.log('Upstash configured:', Boolean(process.env.UPSTASH_REDIS_REST_URL))
```

**Check 3**: Correct region?
- If Vercel is in US East, use Upstash in US East for lowest latency

### "Warning: Upstash not configured"

This is **normal** if you haven't added the environment variables yet. Rate limiting will be **disabled** (all requests allowed) until you configure Upstash.

---

## Cost Information

### Upstash Free Tier
- 10,000 requests/day
- 1,000 requests/second
- Global edge locations
- **Perfect for getting started**

### When to Upgrade?
- If you exceed 10K rate limit checks/day
- Typical usage: 100-500 checks/day for small apps
- Only popular apps need paid tier

### Paid Tier Pricing
- $0.20 per 100K requests
- Example: 1 million requests/month = $2/month
- Very affordable even at scale

---

## Next Steps

1. ✅ **Build fixed** - redeploy will work now
2. ✅ **Rate limiting ready** - add Upstash env vars when you want to enable it
3. ✅ **Tests created** - run with `pnpm test`

To enable rate limiting NOW:
1. Sign up for Upstash (2 min)
2. Add 2 env vars to Vercel (1 min)
3. Redeploy (automatic)

Total time: **5 minutes** ⚡
