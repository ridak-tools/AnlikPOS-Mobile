self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '🔔 Yeni Sipariş Var!', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 Yeni Sipariş Var!';
  const options = {
    body: data.body || 'Adisyon detayları için tıklayın.',
    icon: '/payment-icons/logo.png',
    badge: '/payment-icons/logo.png',
    vibrate: [200, 100, 200, 100, 200],
    data: data,
    tag: 'order-notif-' + (data.orderId || Date.now())
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
