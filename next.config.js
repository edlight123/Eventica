// Honeypot: well-known scanner/attacker probe paths that this app never serves.
// Requests to any of these are rewritten to the decoy responder
// (app/api/honeypot/[[...slug]]/route.ts), which logs the hit and returns
// believable fake content. These are deliberately chosen to NOT overlap with
// any real route (no /admin, no /api/*, no /.well-known, no /manifest).
const HONEYPOT_DECOY_PATHS = [
  '/.env',
  '/.env.local',
  '/.env.production',
  '/.env.backup',
  '/.git/config',
  '/.git/HEAD',
  '/wp-admin',
  '/wp-login.php',
  '/wp-config.php',
  '/wp-config.php.bak',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/phpmyadmin/index.php',
  '/pma',
  '/adminer.php',
  '/.aws/credentials',
  '/server-status',
  '/.svn/entries',
  '/backup.sql',
  '/backup.zip',
  '/database.sql',
  '/dump.sql',
  '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
  '/cgi-bin/luci',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force new build ID to invalidate Vercel cache
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  // Compression and performance
  compress: true,
  poweredByHeader: false,

  // Strip console.* from production bundles, but keep error/warn for observability.
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  
  // Add headers for better caching, performance, and security
  async headers() {
    // Content-Security-Policy allowlist derived from the app's real external
    // origins: Stripe (checkout), Firebase/Google (auth, Firestore, storage,
    // FCM), self-hosted next/font fonts, and Unsplash/GCS images.
    //
    // This policy is ENFORCED (not Report-Only). It shipped as Report-Only
    // first because this is a live payments app and a slightly-off enforcing
    // policy could break Stripe checkout or Google sign-in; the directives
    // below were then audited against every external origin the client
    // actually touches before flipping the header key.
    //
    // Two notes for anyone tightening this further:
    //   - `form-action` MUST keep the MonCash/NatCash hosts. The NatCash
    //     "Hosted Page" flow (app/api/moncash-button/checkout/route.ts) serves
    //     a self-origin page that auto-submits a <form> POST to the gateway.
    //     Under a bare `form-action 'self'` the browser blocks that POST and
    //     NatCash checkout fails outright.
    //   - Plain <a href> navigations (Google/Apple Maps, wa.me, Google
    //     Calendar) are top-level navigations and are NOT restricted by this
    //     policy, so they need no directive.
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      // See the form-action note above — removing these breaks NatCash.
      "form-action 'self' https://moncashbutton.digicelgroup.com https://sandbox.moncashbutton.digicelgroup.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://storage.googleapis.com https://firebasestorage.googleapis.com https://*.googleusercontent.com",
      "font-src 'self' data:",
      // Next.js injects inline styles; recharts sets inline SVG styles.
      "style-src 'self' 'unsafe-inline'",
      // 'unsafe-inline'/'unsafe-eval' are required by Next's runtime today;
      // tighten to a nonce/hash-based policy as a follow-up.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://www.gstatic.com",
      // wss://*.googleapis.com covers Firestore's WebChannel transport, which
      // backs the app's onSnapshot realtime listeners. Without it an enforcing
      // policy can silently kill live dashboard updates.
      "connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://api.stripe.com https://m.stripe.network https://*.stripe.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com https://accounts.google.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "media-src 'self' blob:",
    ].join('; ')

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
          {
            // Don't leak full URLs (which can contain ids/tokens) to third parties.
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Camera is allowed same-origin because ticket check-in scans QR
            // codes via getUserMedia (html5-qrcode / jsqr). Microphone and
            // geolocation are unused by the app, so both are denied.
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            // ENFORCED. See the contentSecurityPolicy note above before
            // editing any directive — `form-action` in particular is
            // load-bearing for NatCash checkout.
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
    ]
  },

  // Serve mobile deep-link association files from /.well-known (env-driven routes).
  // NOTE: guide docs are served by app/guides/[file]/route.ts (reads private
  // Storage objects via the Admin SDK), not by a rewrite.
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
      // Honeypot: route scanner probe paths to the decoy responder. The
      // original probed path is preserved as the destination slug so the
      // handler can pick an appropriate fake response.
      ...HONEYPOT_DECOY_PATHS.map((source) => ({
        source,
        destination: `/api/honeypot${source}`,
      })),
    ]
  },
  
  images: {
    remotePatterns: [
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
