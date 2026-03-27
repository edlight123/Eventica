// Firebase Cloud Messaging Service Worker
// Handles background push notifications when app is not in focus

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Initialize Firebase (configuration is passed from the main app)
firebase.initializeApp({
  apiKey: "AIzaSyCSXqhHHFyOPrNlL4B1xoELs3PNvXJSjrE",
  authDomain: "eventhaiti-c5e1f.firebaseapp.com",
  projectId: "eventhaiti-c5e1f",
  storageBucket: "eventhaiti-c5e1f.firebasestorage.app",
  messagingSenderId: "835455485527",
  appId: "1:835455485527:web:cf9e4ffd05b52fc27de4c7",
  measurementId: "G-TQXD3W91XE"
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)
  
  const notificationTitle = payload.notification?.title || 'Eventica'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: payload.data?.notificationId || 'default',
    data: payload.data,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event)
  
  event.notification.close()
  
  // Get the URL to open from notification data
  let urlToOpen = '/'
  
  if (event.notification.data) {
    const { eventId, ticketId, type } = event.notification.data
    
    if (type === 'ticket_purchased' && ticketId) {
      urlToOpen = `/tickets/${ticketId}`
    } else if (eventId) {
      urlToOpen = `/events/${eventId}`
    } else if (type === 'event_reminder_24h' || type === 'event_reminder_3h' || type === 'event_reminder_30min') {
      urlToOpen = '/tickets'
    }
  }
  
  // Open the URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
