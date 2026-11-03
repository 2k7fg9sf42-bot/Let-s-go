const V = 'vrac-v2';
const FILES = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png',
  '../fonts/fonts.css', '../fonts/instrument-sans-latin-400-normal.woff2', '../fonts/instrument-sans-latin-500-normal.woff2',
  '../fonts/instrument-sans-latin-600-normal.woff2', '../fonts/instrument-serif-latin-400-normal.woff2',
  '../fonts/instrument-serif-latin-400-italic.woff2', '../fonts/jetbrains-mono-latin-400-normal.woff2', '../fonts/jetbrains-mono-latin-500-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('vrac-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Rapide d'abord (cache), puis mise à jour en arrière-plan.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const key = url.origin === location.origin && e.request.mode === 'navigate' ? new Request(new URL('./', self.registration.scope)) : e.request;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(key, {ignoreSearch: e.request.mode === 'navigate'});
    const net = fetch(e.request).then(r => { if (r.ok && url.origin === location.origin) c.put(key, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
