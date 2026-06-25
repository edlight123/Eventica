/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force new build ID to invalidate Vercel cache
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  // Compression and performance
  compress: true,
  poweredByHeader: false,
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@supabase/supabase-js'],
  },
  
  // Add headers for better caching and performance
  async headers() {
    return [
      {
        // Cache static assets aggressively
        source: '/(.*)\\.(jpg|jpeg|png|gif|svg|ico|webp|avif)$',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache fonts
        source: '/(.*)\\.(woff|woff2|eot|ttf|otf)$',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API routes must NEVER be cached by the browser or a shared CDN/proxy.
        // These responses are dynamic and often per-user (auth, payments). In particular
        // the MonCash/NatCash checkout + return endpoints set per-order correlation cookies
        // and issue one-time redirects; if a CDN caches them the fulfillment handler is
        // bypassed and buyers get stale/cross-cached responses (failed checkout, wrong order).
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
          },
        ],
      },
      {
        // Security headers for every route.
        // NOTE: we intentionally do NOT set a blanket "public" Cache-Control here. Most pages
        // are dynamic and/or personalized (event details, dashboards, tickets), and publicly
        // caching them at the edge can leak one user's response to another. Next.js already
        // applies correct caching for genuinely static pages; the rules above handle assets.
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },

  // Serve mobile deep-link association files from /.well-known (env-driven routes)
  async rewrites() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        destination: '/api/well-known/aasa',
      },
      {
        source: '/.well-known/assetlinks.json',
        destination: '/api/well-known/assetlinks',
      },
    ]
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

module.exports = nextConfig
