# Deployment Guide - Eventica

This guide will walk you through deploying Eventica to production on Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier is fine)
- Supabase project configured (see `/supabase/README.md`)

## Step 1: Prepare Your Code

1. **Commit all changes to Git**
   ```bash
   git add .
   git commit -m "Initial Eventica deployment"
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set environment variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. **Deploy to production**
   ```bash
   vercel --prod
   ```

### Option B: Using Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"

2. **Import Git Repository**
   - Connect your GitHub account
   - Select your Eventica repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

4. **Add Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)

## Step 3: Verify Deployment

1. **Visit your deployment URL**
   - Vercel will provide a URL like `eventhaiti-xxx.vercel.app`

2. **Test critical flows**
   - [ ] Homepage loads
   - [ ] User can sign up
   - [ ] User can login
   - [ ] Events display correctly
   - [ ] Organizer can create event
   - [ ] Attendee can buy ticket
   - [ ] QR code displays on ticket

## Step 4: Custom Domain (Optional)

1. **Purchase a domain**
   - Recommended: `eventhaiti.ht` or `joineventica.com`

2. **Add domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

3. **Update DNS records**
   - Add A record or CNAME as instructed by Vercel
   - Wait for DNS propagation (5-30 minutes)

## Step 5: Post-Deployment Configuration

### Enable Production Mode Features

1. **Update Supabase URL Redirects**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Add your production URL to "Redirect URLs"

2. **Configure Email Templates**
   - Customize email templates in Supabase
   - Update logo and branding

### Performance Optimization

1. **Enable Vercel Analytics** (Optional)
   ```bash
   npm install @vercel/analytics
   ```

2. **Add to layout.tsx**
   ```typescript
   import { Analytics } from '@vercel/analytics/react'
   
   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     )
   }
   ```

## Step 6: Monitoring & Maintenance

### Set Up Error Tracking (Optional)

Consider integrating:
- Sentry for error tracking
- Vercel Analytics for performance monitoring
- PostHog for product analytics

### Regular Maintenance

- Monitor Supabase database size
- Review and optimize slow queries
- Update dependencies monthly
- Monitor Vercel build logs

## Troubleshooting

### Build Fails

**Error: "Cannot find module"**
- Solution: Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: "Environment variable not found"**
- Solution: Check that environment variables are set in Vercel dashboard

### Runtime Errors

**Error: "Failed to fetch from Supabase"**
- Check that environment variables are correct
- Verify Supabase project is not paused
- Check RLS policies are configured

**Error: "Authentication not working"**
- Verify redirect URLs in Supabase settings
- Check that NEXT_PUBLIC variables are prefixed correctly

## Rollback Procedure

If you need to rollback a deployment:

1. **Using Vercel Dashboard**
   - Go to Deployments tab
   - Find previous working deployment
   - Click "..." → Promote to Production

2. **Using CLI**
   ```bash
   vercel rollback
   ```

## Continuous Deployment

Vercel automatically deploys on every push to `main` branch.

### Configure Branch Deployments

- `main` → Production
- `develop` → Preview (automatic)
- Feature branches → Preview (automatic)

## Security Checklist

- [ ] Environment variables are set correctly
- [ ] Supabase RLS policies are enabled
- [ ] API routes are protected
- [ ] Rate limiting configured (if needed)
- [ ] CORS configured properly
- [ ] SSL/HTTPS enabled (automatic with Vercel)

## Cost Estimation

### Vercel (Free Tier)
- 100GB bandwidth/month
- Unlimited deployments
- Auto-scaling

### Supabase (Free Tier)
- 500MB database
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users

**Note**: Monitor usage and upgrade plans as needed.

## Support

For deployment issues:
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- Next.js Docs: [nextjs.org/docs](https://nextjs.org/docs)

---

## Quick Reference

**Redeploy**: `vercel --prod`

**View logs**: `vercel logs`

**Environment variables**: `vercel env ls`

**Domain settings**: Project Settings → Domains

**Analytics**: Project Settings → Analytics
