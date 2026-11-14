/* GANKCO Nest 3.0.10 — the background helper for phone notifications.
   It only shows notifications and opens Nest when one is tapped. It stores nothing offline, so every update loads as normal. */
'use strict';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'GANKCO Nest', body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'GANKCO Nest';
  const show = self.registration.showNotification(title, {
    body: d.body || '', icon: 'brand/icon-192.png', badge: 'brand/badge-96.png',
    tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || './' }, timestamp: Date.now()
  });
  // the number on the Nest icon: unread notifications
  const badge = (typeof d.unread === 'number' && self.navigator && self.navigator.setAppBadge)
    ? (d.unread > 0 ? self.navigator.setAppBadge(d.unread) : self.navigator.clearAppBadge()).catch(() => { }) : Promise.resolve();
  e.waitUntil(Promise.all([show, badge]));
});

// tapping a notification opens Nest on that page (or brings an open Nest to the front)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
        c.postMessage({ type: 'nest-open', url });
        return c.focus().then(w => (w && 'navigate' in w ? w.navigate(url).catch(() => w) : w));
      }
    }
    return self.clients.openWindow(url);
  }));
});
