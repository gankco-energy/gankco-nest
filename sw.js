/* GANKCO Nest 3.0.12 — the background helper: phone notifications (3.0.10), and Nest's own files kept on the phone so it opens with no signal.
   Nest's files always come fresh from the internet when there is signal (so every update loads as normal); the saved copy is only
   used when the internet can't be reached. Nothing from Supabase (your data) is stored here. */
'use strict';
const VERSION = '3.0.13b';
const CACHE = 'nest-files-' + VERSION;
// the files Nest loads when it starts (kept on install, so the first time with no signal works too)
const FILES = ["./", "index.html", "brand/favicon.png", "brand/apple-touch-icon.png", "manifest.webmanifest", "styles.css?v=3.0.13b", "config.js?v=3.0.13b", "vendor/supabase.js", "vendor/qrcode.js", "js/core.js?v=3.0.13b", "js/exports.js?v=3.0.13b", "js/views-inv.js?v=3.0.13b", "js/views-ops.js?v=3.0.13b", "js/views-admin.js?v=3.0.13b", "js/views-sign.js?v=3.0.13b", "js/views-plan.js?v=3.0.13b", "js/plan-merge.js?v=3.0.13b", "js/views-alerts.js?v=3.0.13b", "js/push.js?v=3.0.13b", "js/po-docs.js?v=3.0.13b", "js/views-po.js?v=3.0.13b", "js/jt.js?v=3.0.13b", "js/jt-dor.js?v=3.0.13b", "js/jt-live.js?v=3.0.13b", "js/jt-dhr.js?v=3.0.13b", "js/jt-docs.js?v=3.0.13b", "js/rec.js?v=3.0.13b", "js/views-people.js?v=3.0.13b", "js/people-hr.js?v=3.0.13b", "js/people-time.js?v=3.0.13b", "js/pc-core.js?v=3.0.13b", "js/pc-hris.js?v=3.0.13b", "js/pc-company.js?v=3.0.13b", "js/pc-flow.js?v=3.0.13b", "js/pc-leave.js?v=3.0.13b", "js/pc-req.js?v=3.0.13b", "js/pc-exit.js?v=3.0.13b", "js/pc-disc.js?v=3.0.13b", "js/pc-perf.js?v=3.0.13b", "js/pc-perf2.js?v=3.0.13b", "js/pc-onb.js?v=3.0.13b", "js/pc-comp.js?v=3.0.13b", "js/pc-survey.js?v=3.0.13b", "js/pc-pay.js?v=3.0.13b", "js/pc-rep.js?v=3.0.13b", "js/devtools.js?v=3.0.13b", "fonts/barlow-latin-400-normal.woff2", "fonts/barlow-latin-500-normal.woff2", "fonts/barlow-latin-600-normal.woff2", "fonts/barlow-latin-700-normal.woff2", "fonts/montserrat-latin-700-normal.woff2", "fonts/montserrat-latin-800-normal.woff2", "fonts/montserrat-latin-900-normal.woff2", "fonts/barlow-condensed-latin-600-normal.woff2", "fonts/barlow-condensed-latin-700-normal.woff2", "brand/badge-96.png", "brand/dhr-gankco.png", "brand/dor-gankco.png", "brand/icon-192.png", "brand/icon-512.png", "brand/logo-full.png", "brand/mark-96.png", "brand/mark.png", "brand/po-logo.png", "vendor/jspdf.umd.min.js", "vendor/po-fonts.js", "vendor/exceljs.min.js"];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('nest-files-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

// Nest's own files: from the internet first; the saved copy when there's no signal (or the signal is too weak to answer in time)
self.addEventListener('fetch', e => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;           // Supabase and everything else: untouched
  if (/\/(version\.json|sw\.js)$/.test(u.pathname)) return;                       // always asked of the internet
  if (/\/(rest|auth|functions|realtime|storage)\/v1\//.test(u.pathname)) return;      // data, when it's served from the same address: untouched
  if (r.mode !== 'navigate' && !/(\/|\.(js|css|png|jpe?g|svg|ico|woff2?|webmanifest|html))$/.test(u.pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const saved = () => c.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? c.match('./', { ignoreSearch: true }) : null));
    try {
      const net = fetch(r);
      // a weak signal: wait a while, then use the saved copy if there is one
      const res = await Promise.race([net, new Promise(ok => setTimeout(() => ok(null), r.mode === 'navigate' ? 8000 : 12000))]);
      const got = res || await saved() || await net;
      if (got && got.ok && got === res && (got.type === 'basic' || got.type === 'default')) c.put(r, got.clone()).catch(() => { });
      return got;
    } catch (x) {
      const m = await saved(); if (m) return m;
      return new Response('No signal, and this page isn’t saved on this phone yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

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
