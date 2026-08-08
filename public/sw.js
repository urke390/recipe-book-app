// Minimal Web Push service worker: shows a notification for whatever payload
// the server sends, and focuses/opens the app to the relevant session on click.
self.addEventListener('push', (event) => {
  let data = { title: 'ספר מתכונים ביתי', body: 'הזמן הסתיים', url: '/production' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch (e) {
    // non-JSON payload - keep defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: data.url },
      requireInteraction: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/production'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
