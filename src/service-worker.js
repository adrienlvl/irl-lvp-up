/* IRL LVP UP — service worker : rend l'app installable et utilisable hors-ligne (PWA mobile).
   Ne s'active que servi en http(s) ; inactif dans Electron (file://). */
const CACHE = 'irl-lvp-up-v1';
const SHELL = [
  './',
  'index.html',
  'app.js',
  'manifest.webmanifest',
  'style.css',
  'desktop.css',
  'athlete.css',
  'roadmap.css',
  'growth.css',
  'calendar.css',
  'polish.css',
  'strength.css',
  'calendar-page.css',
  'pages.css',
  'trail.css',
  'ultra.css',
  'companion.css',
  'extras.css',
  'mission-control.css',
  'theme.css',
  'print.css',
  'lib/logic.js',
  'lib/exercises-data.js',
  'lib/foods-data.js',
  'lib/exercise-icons.js',
  'assets/irl-lvp-up-logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first avec mise à jour en arrière-plan, repli réseau ; hors-ligne = sert le cache.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
