/* IRL LVP UP — service worker : rend l'app installable et utilisable hors-ligne (PWA mobile).
   Stratégie : network-first pour le code (HTML/CSS/JS) → toujours à jour quand en ligne, repli
   cache hors-ligne ; cache-first pour les images/polices (rapides, changent peu).
   Ne s'active que servi en http(s) ; inactif dans Electron (file://). */
const CACHE = 'irl-lvp-up-v2';
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

function isAsset(url) {
  return /\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf)$/i.test(url.pathname);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // même origine seulement

  if (isAsset(url)) {
    // Images/polices : cache-first + mise à jour en arrière-plan (rapide, offline).
    event.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
  } else {
    // Code / navigation : network-first (toujours frais en ligne), repli cache hors-ligne.
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('index.html')))
    );
  }
});
