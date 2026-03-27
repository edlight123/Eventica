# Earnings System Deployment Checklist

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables
Add these to Vercel/production environment:

```bash
# Cron Job Security
CRON_SECRET=<generate-secure-random-string>

# Existing (verify they're set)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_SERVICE_ACCOUNT_KEY=<json-string>
```

**Generate CRON_SECRET:**
```bash
openssl rand -base64 32
```

### 2. Firestore Indexes
Deploy the indexes defined in `firestore.indexes.json`:

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Or manually create via Firebase Console:
# https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes
```

**Required Indexes:**
- ✅ `event_earnings`: organizerId + settlementStatus + createdAt
- ✅ `event_earnings`: organizerId + availableToWithdraw
- ✅ `event_earnings`: settlementStatus + settlementReadyDate
- ✅ `withdrawal_requests`: status + createdAt
- ✅ `withdrawal_requests`: organizerId + status + createdAt
- ✅ `withdrawal_requests`: eventId + createdAt

### 3. Firestore Security Rules
Update `firestore.rules` to secure new collections:

```javascript
match /event_earnings/{earningId} {
  // Organizers can read their own earnings
  allow read: if request.auth != null && 
    resource.data.organizerId == request.auth.uid;
  
  // Only server can write
  allow write: if false;
}

match /withdrawal_requests/{requestId} {
  // Organizers can read their own requests
  allow read: if request.auth != null && 
    resource.data.organizerId == request.auth.uid;
  
  // Organizers can create requests
  allow create: if request.auth != null && 
    request.resource.data.organizerId == request.auth.uid;
  
  // Only server can update
  allow update: if false;
}
```

**Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

### 4. Stripe Webhook Configuration
Verify webhook endpoint is configured:

**Webhook URL:** `https://your-domain.com/api/webhooks/stripe`

**Events to listen for:**
- ✅ `checkout.session.completed`
- ✅ `payment_intent.succeeded`

**Test webhook:**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

---

## 📦 Deployment Steps

### Step 1: Deploy Code
```bash
# Commit all changes
git add .
git commit -m "feat: implement earnings tracking system"
git push origin main

# Vercel auto-deploys from main branch
```

### Step 2: Set Environment Variables
In Vercel Dashboard:
1. Go to Settings > Environment Variables
2. Add `CRON_SECRET`
3. Ensure all other variables are present
4. Redeploy if variables were added

### Step 3: Deploy Firestore Configuration
```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Deploy security rules
firebase deploy --only firestore:rules

# Or deploy both
firebase deploy --only firestore
```

### Step 4: Verify Cron Job
Check in Vercel:
1. Go to Project Settings > Cron Jobs
2. Verify `/api/cron/update-settlement-status` is listed
3. Schedule should be `0 2 * * *` (daily at 2 AM UTC)

### Step 5: Create Admin User
Make your account an admin by updating Firestore:
```javascript
// In Firebase Console > Firestore
// Document: users/{your-user-id}
{
  email: "your-email@example.com",
  role: "admin"  // Add this field
}
```

Or use the admin check in `lib/admin.ts`:
```typescript
// Add your email to the list
export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  const adminEmails = [
    'admin@joineventica.com',
    'your-email@example.com'  // Add yours here
  ]
  return adminEmails.includes(email.toLowerCase())
}
```

---

## 🧪 Testing Checklist

### Test 1: Automatic Earnings Tracking
```bash
✅ Create a test event
✅ Purchase tickets using Stripe test card (4242 4242 4242 4242)
✅ Verify earnings record created in Firestore: event_earnings/{eventId}
✅ Check earnings dashboard shows correct amounts
✅ Verify fee calculations are accurate
```

### Test 2: Earnings Dashboard
```bash
✅ Navigate to /organizer/earnings
✅ Verify summary cards display correct totals
✅ Test filter tabs (All, Ready, Pending, Locked)
✅ Click on an event row
✅ Verify per-event earnings page loads
✅ Test mobile responsiveness
```

### Test 3: Settlement Status
```bash
✅ Create event with past date
✅ Purchase tickets
✅ Verify settlementStatus is 'pending'
✅ Manually update settlementReadyDate to past date in Firestore
✅ Call cron endpoint manually
✅ Verify status changed to 'ready'
```

Manual cron trigger:
```bash
curl -X GET https://your-domain.com/api/cron/update-settlement-status \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test 4: Withdrawal Flow - MonCash
```bash
✅ Ensure event earnings are 'ready' with balance > $50
✅ Navigate to /organizer/events/{eventId}/earnings
✅ Click "MonCash" withdrawal button
✅ Enter phone number: +509 1234 5678
✅ Submit withdrawal
✅ Verify withdrawal_requests document created
✅ Verify earnings updated (availableToWithdraw decreased)
✅ Check /admin/withdrawals shows new request
```

### Test 5: Withdrawal Flow - Bank Transfer
```bash
✅ Click "Bank Transfer" button
✅ Fill all bank details (account holder, bank name, account #)
✅ Submit withdrawal
✅ Verify withdrawal_requests document created
✅ Verify earnings updated correctly
✅ Check admin dashboard shows request
```

### Test 6: Admin Approval Workflow
```bash
✅ Login as admin user
✅ Navigate to /admin/withdrawals
✅ Verify pending requests are shown
✅ Click "View Details" on a request
✅ Test "Approve & Process" action
✅ Verify status changed to 'processing'
✅ Test "Mark Complete" action
✅ Verify status changed to 'completed'
```

### Test 7: Admin Rejection
```bash
✅ Create another withdrawal request
✅ In admin dashboard, click "Reject"
✅ Add rejection note
✅ Verify status changed to 'failed'
✅ Verify funds returned to earnings (availableToWithdraw increased)
✅ Verify organizer can see rejection reason
```

---

## 🔍 Monitoring & Verification

### Check Firestore Collections
After testing, verify these collections exist and have data:

```
✅ event_earnings/{eventId}
✅ withdrawal_requests/{requestId}
```

### Verify Indexes
Check Firebase Console > Firestore > Indexes:
```
✅ All 6 indexes show status: "Enabled"
✅ No indexes show "Building" or "Error"
```

### Monitor Logs
Check Vercel logs for:
```
✅ Successful webhook calls: "✅ Updated earnings for event"
✅ Cron job executions: "🎉 Cron job completed"
✅ No error logs related to earnings or withdrawals
```

### Verify API Endpoints
Test each endpoint:
```bash
# Earnings API
curl https://your-domain.com/api/organizer/earnings \
  -H "Cookie: session=..."

# Admin Withdrawals API
curl https://your-domain.com/api/admin/withdrawals?status=pending \
  -H "Cookie: session=..."

# Cron Job
curl https://your-domain.com/api/cron/update-settlement-status \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 🚨 Troubleshooting

### Issue: Earnings not recording
**Solution:**
1. Check Stripe webhook is configured and firing
2. Verify webhook endpoint: `/api/webhooks/stripe`
3. Check webhook secret matches `STRIPE_WEBHOOK_SECRET`
4. Look for errors in Vercel logs under webhook route

### Issue: Settlement status not updating
**Solution:**
1. Verify CRON_SECRET is set in environment variables
2. Check cron job ran (Vercel Dashboard > Functions)
3. Verify Firestore index for `settlementStatus + settlementReadyDate`
4. Manually trigger cron to test: `curl -X GET .../api/cron/update-settlement-status -H "Authorization: Bearer SECRET"`

### Issue: Withdrawal fails
**Solution:**
1. Check settlement status is 'ready'
2. Verify availableToWithdraw >= 5000 cents ($50)
3. Check Firestore security rules allow organizer to create withdrawal_requests
4. Look for API errors in Vercel logs

### Issue: Admin dashboard not showing requests
**Solution:**
1. Verify user has admin role/email
2. Check `isAdmin()` function in `lib/admin.ts`
3. Verify Firestore index for `withdrawal_requests` with status field
4. Check browser console for API errors

### Issue: Fee calculations incorrect
**Solution:**
1. Verify FEE_CONFIG in `types/earnings.ts`
2. Check `calculateFees()` in `lib/fees.ts`
3. Ensure amounts are in cents (multiply by 100)
4. Test calculation manually:
   - Gross: $100.00 = 10000 cents
   - Platform (10%): $10.00 = 1000 cents
   - Stripe (2.9% + $0.30): $3.20 = 320 cents
   - Net: $86.80 = 8680 cents

---

## 📊 Success Metrics

After deployment, monitor these metrics:

### Week 1
- ✅ All ticket purchases generate earnings records
- ✅ Zero errors in webhook processing
- ✅ Cron job runs daily without failures
- ✅ At least 1 successful test withdrawal

### Week 2
- ✅ Organizers viewing earnings dashboard
- ✅ Settlement status updates automatically
- ✅ Admin processes real withdrawal requests
- ✅ No reported calculation errors

### Week 3
- ✅ Multiple successful withdrawals processed
- ✅ Organizers satisfied with transparency
- ✅ Admin workflow is efficient
- ✅ System stable with no issues

---

## 🎯 Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor first cron job execution at 2 AM UTC
- [ ] Process first real withdrawal request
- [ ] Verify all endpoints returning correct data
- [ ] Check error logs for any issues

### Short-term (Week 1)
- [ ] Collect feedback from organizers
- [ ] Document any edge cases found
- [ ] Create support documentation for organizers
- [ ] Set up monitoring/alerting for failed withdrawals

### Medium-term (Month 1)
- [ ] Analyze withdrawal patterns
- [ ] Optimize admin workflow based on usage
- [ ] Consider adding email notifications
- [ ] Plan Phase 2 features (Stripe Connect for US/CA)

---

## 📝 Rollback Plan

If critical issues occur:

### Quick Rollback
```bash
# Revert to previous deployment
vercel rollback
```

### Disable Cron Job
Remove from `vercel.json` and redeploy:
```json
// Comment out or remove
// {
//   "path": "/api/cron/update-settlement-status",
//   "schedule": "0 2 * * *"
// }
```

### Disable Earnings Tracking
Comment out in `app/api/webhooks/stripe/route.ts`:
```typescript
// Temporarily disable earnings tracking
// await addTicketToEarnings(eventId, amount_total, quantity)
```

---

## ✅ Final Verification

Before marking deployment complete:

- [ ] All environment variables set
- [ ] Firestore indexes deployed and enabled
- [ ] Firestore security rules deployed
- [ ] Stripe webhook configured
- [ ] Cron job configured in vercel.json
- [ ] CRON_SECRET added to environment
- [ ] Admin user configured
- [ ] Test withdrawal completed successfully
- [ ] Admin approval workflow tested
- [ ] All API endpoints responding
- [ ] Mobile responsive design verified
- [ ] No TypeScript/build errors
- [ ] Documentation updated

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Production URL:** https://_________________

**Status:** ⬜ Pending | ⬜ In Progress | ⬜ Complete

---

## 🆘 Support Contacts

- **Technical Issues:** Open GitHub issue
- **Stripe Problems:** Check Stripe Dashboard logs
- **Firebase Issues:** Firebase Console > Usage tab
- **Vercel Deployment:** Vercel Dashboard > Logs

---

**Last Updated:** December 2024
**Version:** 1.0.0
