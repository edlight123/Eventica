// Basic service worker for Eventica PWA
// Extensible: add caching strategies or push handlers later
const STATIC_CACHE = 'eventica-static-v4'
const NAV_CACHE = 'eventica-nav-v3'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon-192.svg',
        '/icon-512.svg',
        '/offline.html'
      ])
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => ![STATIC_CACHE, NAV_CACHE].includes(k)).map(k => caches.delete(k))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Only handle GET requests
  if (request.method !== 'GET') return
  
  // Skip API requests and external resources - let them pass through
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return
  }

  // Never cache Next.js build assets. These are already fingerprinted and should
  // come from the network to avoid serving stale UI after a deployment.
  if (url.pathname.startsWith('/_next/')) {
    return
  }
  
  const isNavigation = request.mode === 'navigate'
  
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then(resp => {
          const clone = resp.clone()
          if (resp.ok) caches.open(NAV_CACHE).then(c => c.put(request, clone))
          return resp
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/offline.html')))
    )
    return
  }
  
  // For other same-origin GET requests, try cache first then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      
      return fetch(request)
        .then((resp) => {
          // Only cache successful responses from our origin
          if (resp.ok && resp.status < 400) {
            const clone = resp.clone()
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
          }
          return resp
        })
        .catch((err) => {
          // On network error, return 404 response instead of error response
          console.warn('[SW] Fetch failed for:', request.url, err)
          return new Response('Network error', {
            status: 408,
            statusText: 'Request Timeout',
            headers: { 'Content-Type': 'text/plain' }
          })
        })
    })
  )
})

// Placeholder push handler (extend later)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event)
  const data = event.data ? event.data.json() : { title: 'Eventica', body: 'New update available.', data: { url: '/' } }
  console.log('[SW] Push data:', data)
  const actions = [
    { action: 'open-tickets', title: 'Tickets' },
    { action: 'open-home', title: 'Home' }
  ]
  const notificationPromise = self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'eventica-general',
    renotify: false,
    timestamp: Date.now(),
    actions,
    data: data.data || {}
  })
  console.log('[SW] Showing notification')
  event.waitUntil(notificationPromise)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  let url = data.url || '/'
  if (event.action === 'open-tickets') url = '/tickets'
  if (event.action === 'open-home') url = '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
