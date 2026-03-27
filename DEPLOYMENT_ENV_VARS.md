# 🚀 Deployment Environment Variables

## Required Environment Variables for Vercel

Add these to your Vercel project: **Settings > Environment Variables**

### 1. CRON_SECRET (New - Required for Earnings System)
```bash
CRON_SECRET=SDhk0LptE2CEchml2DKJl5pFONQrzi+/SjDl9bHv9lg=
```

**Purpose:** Authenticates the settlement status cron job endpoint  
**Used by:** `/api/cron/update-settlement-status`  
**Security:** Never commit to git, only set in Vercel dashboard

---

### 2. PAYOUT_DETAILS_ENCRYPTION_KEY (New - Required for "Bank on file")

```bash
# 32 bytes key (base64). Generate one:
PAYOUT_DETAILS_ENCRYPTION_KEY=$(openssl rand -base64 32)
```

**Purpose:** Encrypts saved payout destination details (bank account numbers) stored in Firestore.  
**Used by:** Saved bank destinations + withdrawals using “bank on file”.  
**Security:** Treat like a secret. Do not rotate without a migration plan (old encrypted destinations become unreadable).

---

### 3. SOGEPAY (New - Required for Haiti card payments)

Haiti-based events (event `country = HT`) must use **Sogepay** for card payments (Stripe card flows are blocked for HT).

```bash
SOGEPAY_ENABLED=true

# Hosted checkout URL provided by Sogepay (format depends on your Sogepay integration).
# The app will append `orderId` and `eventId` as query params.
SOGEPAY_CHECKOUT_URL=https://<sogepay-hosted-checkout-url>
```

**Purpose:** Routes Haiti card payments to Sogepay instead of Stripe.

---

### 4. Existing Environment Variables (Verify These Exist)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Connect (Required for USA/Canada events)
# USA/Canada events (event country US/CA) use Stripe Connect destination charges.
# Ensure Stripe Connect is enabled in your Stripe dashboard and organizers complete onboarding.

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# NextAuth (if using)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com
```

---

## How to Add Environment Variables to Vercel

### Via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your Eventica project
3. Click **Settings** tab
4. Click **Environment Variables** in sidebar
5. Add each variable:
   - **Key:** `CRON_SECRET`
   - **Value:** `SDhk0LptE2CEchml2DKJl5pFONQrzi+/SjDl9bHv9lg=`
   - **Environments:** Select all (Production, Preview, Development)
6. Click **Save**

### Via Vercel CLI:
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Add environment variable
vercel env add CRON_SECRET
# Paste: SDhk0LptE2CEchml2DKJl5pFONQrzi+/SjDl9bHv9lg=
# Select: Production, Preview, Development
```

---

## Testing the Cron Job

Once deployed, test the cron endpoint:

```bash
# Replace with your actual domain and CRON_SECRET
curl -X GET https://joineventica.com/api/cron/update-settlement-status \
  -H "Authorization: Bearer SDhk0LptE2CEchml2DKJl5pFONQrzi+/SjDl9bHv9lg="
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-12-18T...",
  "pendingUpdated": 0,
  "lockedUnlocked": 0,
  "failed": 0,
  "total": 0
}
```

---

## Firebase Deployment Status

✅ **Firestore Indexes:** Deployed successfully
- Event: December 18, 2024
- Project: eventica
- Database: (default)
- Indexes: 6 new composite indexes for earnings system

### Deployed Indexes:
1. `event_earnings`: organizerId + settlementStatus + createdAt
2. `event_earnings`: organizerId + availableToWithdraw
3. `event_earnings`: settlementStatus + settlementReadyDate
4. `withdrawal_requests`: status + createdAt
5. `withdrawal_requests`: organizerId + status + createdAt
6. `withdrawal_requests`: eventId + createdAt

Check status: https://console.firebase.google.com/project/eventica/firestore/indexes

---

## Next Steps

### 1. Add CRON_SECRET to Vercel
- [ ] Login to Vercel dashboard
- [ ] Navigate to Settings > Environment Variables
- [ ] Add CRON_SECRET with value above
- [ ] Select all environments
- [ ] Save changes

### 2. Deploy to Production
```bash
git add .
git commit -m "feat: complete earnings system with indexes"
git push origin main
```

### 3. Verify Deployment
- [ ] Check Vercel deployment succeeds
- [ ] Verify cron job is configured (Settings > Cron Jobs)
- [ ] Test with Stripe test card
- [ ] Monitor first cron execution (next day at 2 AM UTC)

### 4. Configure Admin Access
Add your email to admin list in `lib/admin.ts`:
```typescript
const adminEmails = [
  'admin@joineventica.com',
  'info@edlight.org'  // Your email
]
```

---

## Security Notes

⚠️ **Never commit these secrets to git:**
- CRON_SECRET
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- FIREBASE_SERVICE_ACCOUNT_KEY
- Any API keys or passwords

✅ **Always use environment variables** for sensitive data

---

## Troubleshooting

### Cron job returns 401 Unauthorized
- Verify CRON_SECRET is set in Vercel environment variables
- Check the Authorization header format: `Bearer <secret>`
- Ensure no spaces or line breaks in the secret value

### Firestore queries are slow
- Verify all indexes are deployed: `firebase deploy --only firestore:indexes`
- Check index status in Firebase Console: Firestore > Indexes
- Wait for indexes to finish building (can take a few minutes)

### Earnings not tracking
- Verify Stripe webhook is configured
- Check webhook secret matches STRIPE_WEBHOOK_SECRET
- Look for errors in Vercel function logs

---

## Contact

**Project:** Eventica  
**Firebase Project:** eventica  
**Account:** info@edlight.org  

For support, check:
- [EARNINGS_DEPLOYMENT_CHECKLIST.md](EARNINGS_DEPLOYMENT_CHECKLIST.md)
- [EARNINGS_COMPLETE_REPORT.md](EARNINGS_COMPLETE_REPORT.md)

---

**Last Updated:** December 18, 2024  
**Status:** ✅ Ready for Production Deployment
