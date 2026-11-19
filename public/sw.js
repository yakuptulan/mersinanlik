// Mersin Anlık bildirim servisi: yalnızca sabah bildirimlerini gösterir, sayfa önbelleği tutmaz.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let v = {};
  try { v = e.data ? e.data.json() : {}; } catch (x) {}
  e.waitUntil(self.registration.showNotification(v.baslik || 'Mersin Anlık', {
    body: v.metin || 'Gündemin hazır',
    icon: '/ikon-192.png',
    badge: '/favicon-48.png',
    tag: v.etiket || 'gundem',
    data: { url: v.url || '/gundemim/' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
    for (const c of l) if (c.url === url && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
