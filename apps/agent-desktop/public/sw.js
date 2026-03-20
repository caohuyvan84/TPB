/**
 * Service Worker for TPB Agent Desktop — handles Web Push notifications for incoming calls.
 * Ensures agent receives call alerts even when tab is frozen/background.
 */

self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(self.clients.claim());
});

/**
 * Handle incoming push notification from CTI Adapter.
 * Payload: { type, callerNumber, callerName, queue, callId, agentId }
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { type: 'unknown', body: event.data.text() };
  }

  console.log('[SW] Push received:', payload.type);

  if (payload.type === 'incoming_call') {
    const title = '\u{1F4DE} Cu\u1ED9c g\u1ECDi \u0111\u1EBFn';
    const callerName = payload.callerName || payload.callerNumber || 'Unknown';
    const callerNumber = payload.callerNumber || '';
    const queue = payload.queue ? ` (Queue: ${payload.queue})` : '';
    const body = `${callerName} \u2014 ${callerNumber}${queue}`;

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `incoming-call-${payload.callId || 'unknown'}`,
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        data: payload,
        actions: [
          { action: 'focus', title: 'Xem' },
        ],
      })
    );
  }

  if (payload.type === 'call_ended' || payload.type === 'call_missed' || payload.type === 'call_answered') {
    // Close the incoming call notification
    event.waitUntil(
      self.registration.getNotifications({ tag: `incoming-call-${payload.callId}` })
        .then(notifications => {
          notifications.forEach(n => n.close());
        })
    );

    // Show missed call notification if applicable
    if (payload.type === 'call_missed') {
      event.waitUntil(
        self.registration.showNotification('Cu\u1ED9c g\u1ECDi nh\u1EE1', {
          body: `${payload.callerNumber || 'Unknown'} \u2014 kh\u00F4ng k\u1ECBp tr\u1EA3 l\u1EDDi`,
          icon: '/favicon.ico',
          tag: `missed-call-${payload.callId}`,
          data: payload,
        })
      );
      // Auto-close missed notification after 10s
      setTimeout(async () => {
        const notifs = await self.registration.getNotifications({ tag: `missed-call-${payload.callId}` });
        notifs.forEach(n => n.close());
      }, 10000);
    }
  }
});

/**
 * Handle notification click — focus the agent desktop tab.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Find existing agent desktop tab
      for (const client of clients) {
        if (client.url.includes('/agent') || client.url.includes('nextgen.omicx.vn')) {
          return client.focus();
        }
      }
      // No existing tab — open new one
      return self.clients.openWindow('/');
    })
  );
});
