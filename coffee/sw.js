// Offline support for the coffee page. Pages come from the network when it answers
// within 3 seconds (so updates arrive) and from the saved copy otherwise.
var CACHE = 'coffee-v1';
var FILES = ['./', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Only the page itself is stored as the page; opening sw.js or an icon directly must not replace it.
  var path = new URL(req.url).pathname;
  var isPage = req.mode === 'navigate' && (/\/$/.test(path) || /\/index\.html$/.test(path));
  var key = isPage ? './' : req;
  e.respondWith(caches.open(CACHE).then(function (c) {
    var fromNet = fetch(req).then(function (res) {
      if (res.ok) c.put(key, res.clone());
      return res;
    });
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 3000); });
    return Promise.race([fromNet, timeout]).then(function (res) {
      return res || c.match(key).then(function (hit) { return hit || fromNet; });
    }).catch(function () {
      return c.match(key).then(function (hit) { return hit || Response.error(); });
    });
  }));
});
