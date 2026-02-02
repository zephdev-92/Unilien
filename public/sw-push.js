// ============================================
// SERVICE WORKER - PUSH NOTIFICATIONS
// ============================================
// Ce fichier gère les notifications push en arrière-plan
// Il est importé par le service worker principal de vite-plugin-pwa

// ============================================
// PUSH EVENT HANDLER
// ============================================

self.addEventListener('push', (event) => {
  console.log('[SW Push] Notification push reçue')

  let payload

  if (!event.data) {
    // Push sans payload (mode "tickle") - afficher une notification générique
    console.log('[SW Push] Push sans payload - notification générique')
    payload = {
      title: 'Unilien',
      body: 'Vous avez une nouvelle notification',
      data: { url: '/dashboard' }
    }
  } else {
    try {
      payload = event.data.json()
    } catch (e) {
      // Si ce n'est pas du JSON, essayer comme texte
      const text = event.data.text()
      payload = {
        title: 'Unilien',
        body: text || 'Nouvelle notification',
        data: { url: '/dashboard' }
      }
    }
  }

  const {
    title = 'Unilien',
    body = '',
    icon = '/pwa-192x192.png',
    badge = '/pwa-192x192.png',
    tag,
    data = {},
    actions = [],
  } = payload

  const options = {
    body,
    icon,
    badge,
    tag: tag || `unilien-${Date.now()}`,
    data,
    actions,
    vibrate: [100, 50, 100],
    requireInteraction: data.priority === 'urgent',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Informer l'app si elle est au premier plan
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_RECEIVED',
              payload: { title, body, icon, badge, tag, data, actions },
            })
          })
        })
    })
  )
})

// ============================================
// NOTIFICATION CLICK HANDLER
// ============================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Clic sur notification')

  event.notification.close()

  const data = event.notification.data || {}
  const action = event.action

  // Déterminer l'URL de destination
  let targetUrl = '/'

  if (action && data.actions && data.actions[action]) {
    targetUrl = data.actions[action]
  } else if (data.url) {
    targetUrl = data.url
  } else if (data.actionUrl) {
    targetUrl = data.actionUrl
  }

  // Ouvrir ou focus sur la fenêtre de l'app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Chercher une fenêtre existante
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            // Focus et naviguer
            return client.focus().then(() => {
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                url: targetUrl,
                notificationId: data.notificationId,
              })
              return client.navigate(targetUrl)
            })
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        return self.clients.openWindow(targetUrl)
      })
  )
})

// ============================================
// NOTIFICATION CLOSE HANDLER
// ============================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW Push] Notification fermée')

  const data = event.notification.data || {}

  // Informer l'app que la notification a été fermée
  self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_CLOSED',
          notificationId: data.notificationId,
        })
      })
    })
})

// ============================================
// PUSH SUBSCRIPTION CHANGE
// ============================================

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW Push] Subscription changée, renouvellement...')

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then((subscription) => {
      // Informer l'app du changement
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: subscription.toJSON(),
            })
          })
        })
    })
  )
})

console.log('[SW Push] Service Worker Push chargé')
