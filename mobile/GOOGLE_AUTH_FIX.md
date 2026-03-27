# Fix Google "Access Blocked" Error

## The Issue
Google is blocking the sign-in because your OAuth app needs to be configured with Expo's redirect URI.

## Quick Fix - Add Expo Redirect URI to Google Cloud

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/apis/credentials
2. Select your project: **eventica**

### Step 2: Find Your OAuth Client ID
1. Look for the OAuth 2.0 Client ID that matches: `71580084056-sngjoi0agfg6ro6ben71eo2taghe6t2n`
2. Click on it to edit

### Step 3: Add Redirect URIs
Add these redirect URIs to the "Authorized redirect URIs" section:

```
https://auth.expo.io/@anonymous/eventhaiti-mobile
eventica://
```

**Note:** Google doesn't allow underscores in redirect URIs, so we use the generic Expo redirect.

### Step 4: Save Changes
1. Click "Save" at the bottom
2. Wait 5-10 minutes for changes to propagate

### Step 5: Test Again
1. Reload the mobile app
2. Try "Continue with Google"
3. Should work now!

---

## Alternative Solution (Recommended for Now)

Since Google OAuth setup can be complicated, I recommend using **Email/Password Sign-In** for now:

### Why Email/Password is Better for Development:
- ✅ **Works immediately** - No Google verification needed
- ✅ **Same functionality** - Creates accounts, saves favorites, etc.
- ✅ **Faster** - No browser redirects
- ✅ **More private** - Users control their data

### How to Use:
1. On login screen, tap **"Sign Up"**
2. Enter:
   - Email: your@email.com
   - Password: (any password)
   - Full Name: Your Name
3. Tap **"Sign Up"**
4. **You're logged in!**

### Next Time:
Just use the same email/password to sign in.

---

## For Production (Later)

When you're ready to publish the app, you'll need to:

1. **Verify your OAuth app** with Google
2. **Add privacy policy** URL
3. **Submit app for review** (if needed)
4. **Configure production redirect URIs**

But for testing and development, **use Email/Password sign-in** - it works perfectly!

---

## Summary

**Quick Fix:** Add Expo redirect URIs to Google Cloud Console (5-10 minutes)

**Better Option:** Use Email/Password sign-in (works now, no setup needed)

**Current Status:**
- ✅ Email/Password Sign-In - **WORKS**
- ✅ Email/Password Sign-Up - **WORKS**
- ⚠️ Google Sign-In - Needs redirect URI added
- ✅ All events showing - **WORKS**
- ✅ Favorites - **WORKS**
- ✅ Search/Filter - **WORKS**

Try signing up with email/password instead! It's faster and works perfectly. 🚀
