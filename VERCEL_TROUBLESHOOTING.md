# 🔧 Vercel Deployment Troubleshooting

## Issue: Blank Page on Vercel

If you see a blank page after deploying to Vercel, follow these steps:

## ✅ Step 1: Check Environment Variables

**This is the #1 cause of blank pages!**

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the sidebar
4. Verify you have these variables set:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### How to Add Environment Variables:

1. In Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click **Add New**
3. For **Name**: `NEXT_PUBLIC_SUPABASE_URL`
4. For **Value**: Your Supabase project URL (from Supabase Settings → API)
5. For **Environment**: Check all three (Production, Preview, Development)
6. Click **Save**
7. Repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### ⚠️ IMPORTANT: Redeploy After Adding Variables

After adding environment variables, you MUST redeploy:
1. Go to **Deployments** tab
2. Click the **•••** menu on the latest deployment
3. Click **Redeploy**
4. Wait for new deployment to complete

---

## ✅ Step 2: Check Build Logs

1. Go to **Deployments** tab in Vercel
2. Click on the latest deployment
3. Check the **Build Logs** section
4. Look for any errors (red text)

### Common Build Errors:

**"Module not found"**
- Solution: Check that all imports are correct
- Make sure you have `@supabase/ssr` in dependencies

**"Type error"**
- Solution: TypeScript errors - check the specific file mentioned

**"Environment variable not found"**
- Solution: Add the environment variables (see Step 1)

---

## ✅ Step 3: Check Runtime Logs

1. In Vercel Dashboard → Your Project
2. Click on **Logs** in the top menu
3. Look for runtime errors

### Common Runtime Errors:

**"Failed to connect to Supabase"**
- Check environment variables are correct
- Verify Supabase URL and key are valid

**"Unauthorized"**
- Check your Supabase RLS policies
- Make sure the anon key has permission to read published events

---

## ✅ Step 4: Verify Supabase Setup

### Check Database Tables Exist:
1. Go to Supabase Dashboard
2. Click **Table Editor**
3. Verify these tables exist:
   - users
   - events
   - tickets
   - ticket_scans

### Check RLS Policies:
1. In Supabase Table Editor, click on `events` table
2. Click the **shield icon** (RLS)
3. Verify policy "Anyone can view published events" exists

---

## ✅ Step 5: Test Locally First

Before debugging Vercel, make sure it works locally:

```bash
# Install dependencies
npm install

# Create .env.local with your Supabase credentials
# Add:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Run development server
npm run dev

# Open http://localhost:3000
```

If it works locally but not on Vercel → environment variable issue!

---

## ✅ Step 6: Check Browser Console

1. Open your Vercel deployment URL
2. Press **F12** to open Developer Tools
3. Click **Console** tab
4. Look for any errors (red text)

### Common Console Errors:

**"Failed to load resource: net::ERR_NAME_NOT_RESOLVED"**
- Supabase URL is wrong or missing

**"Access denied"**
- RLS policies blocking access
- Anon key doesn't have permission

**"hydration error"**
- Server/client mismatch (usually resolves on refresh)

---

## 🚀 Quick Fix Checklist

Try these in order:

1. ✅ **Add Environment Variables in Vercel**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. ✅ **Redeploy** (MUST do this after adding variables)

3. ✅ **Check Supabase URL Configuration**
   - In Supabase → Authentication → URL Configuration
   - Add your Vercel URL to "Site URL"
   - Add your Vercel URL to "Redirect URLs"

4. ✅ **Verify Database Schema**
   - Make sure you ran the `/supabase/schema.sql` script

5. ✅ **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## 🔍 Detailed Debugging Steps

### If Still Blank:

1. **Check the exact Vercel URL**
   ```
   https://your-project-name.vercel.app
   ```

2. **Check if the build succeeded**
   - Green checkmark = Success
   - Red X = Failed (read build logs)

3. **Check the deployment status**
   - Should say "Ready" not "Building"

4. **Try these URLs on your deployment:**
   - `/` (homepage)
   - `/auth/login` (should show login page)
   - `/auth/signup` (should show signup page)

5. **If login/signup work but homepage is blank:**
   - Database connection issue
   - Check Supabase credentials
   - Check Supabase project is not paused

---

## 📸 What You Should See

### Successful Deployment:
- ✅ Eventica logo/branding
- ✅ Hero section with "Discover Events in Haiti"
- ✅ "Sign in" and "Sign up" buttons in navbar
- ✅ "No events yet" message (if no events created)

### If You See Blank White Page:
- ❌ Environment variables missing
- ❌ Build failed
- ❌ JavaScript error (check console)

---

## 🆘 Still Not Working?

### Step-by-Step Reset:

1. **Delete the Vercel project**
2. **Push a fresh commit to GitHub**
3. **Import to Vercel again**
4. **Add environment variables BEFORE first deployment**
5. **Deploy**

### Manual Deployment Test:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from terminal (follow prompts)
vercel

# Add environment variables when prompted
# Or add them in dashboard and run:
vercel --prod
```

---

## 📋 Environment Variables Template

Copy this to Vercel:

```
# Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzOTYxNjEyMCwiZXhwIjoxOTU1MTkyMTIwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get these values from:
- Supabase Dashboard → Settings → API

---

## ✅ Success Checklist

Your deployment is successful when:
- [ ] Vercel build shows green checkmark
- [ ] Environment variables are set in Vercel
- [ ] Homepage loads and shows Eventica branding
- [ ] Can navigate to /auth/login
- [ ] Can navigate to /auth/signup
- [ ] No errors in browser console
- [ ] No errors in Vercel logs

---

## 💡 Pro Tips

1. **Always test locally first** with the same environment variables
2. **Redeploy after ANY environment variable change**
3. **Check browser console** for client-side errors
4. **Check Vercel logs** for server-side errors
5. **Use Vercel CLI** for more detailed debugging

---

## 🔗 Useful Links

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Supabase Auth with Vercel](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**Most likely issue: Missing environment variables + need to redeploy!**

Try adding the environment variables in Vercel dashboard, then redeploy. That fixes 90% of blank page issues! 🎯
