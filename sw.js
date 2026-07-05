self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : {};
  var title = data.title || 'SOLI';
  var options = {
    body: data.body || 'היי, מה נשמע?',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/app' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/app'));
});
