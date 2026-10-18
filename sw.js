/* Bandly AI — service worker */
/* Bump the cache name on EVERY sw.js change: activate() deletes only other
   caches, so a new name per release is what guarantees one cache contains
   exactly one deploy's assets (see the offline matcher below). */
const CACHE = 'bandly-v20';
const PRECACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/learning.css',
  '/miniGames.js',
  '/lib/learningPath.js',
  '/lib/roadmapContent.js',
  '/lib/adaptiveDrills.js',
  '/data.js',
  '/content2.js',
  '/content3.js',
  '/content4.js',
  '/i18n.js',
  '/services.js',
  '/script.js',
  '/admin.js',
  '/lib/topicPool.js',
  '/lib/aiGuardrails.js',
  '/mockGenerator.js',
  '/supabase.bundle.js',
  '/markdown.bundle.js',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/mascot-192.png',
  '/icons/mascot-512.png',
  '/assets/mascot.png',
  '/assets/mascot.webp',
  '/assets/mascot-head.png',
  '/assets/mascot-head.webp',
  '/assets/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      return res;
    }).catch(() =>
      /* Offline: index.html asks for fingerprinted assets (?v=n), but cache
         keys are what was actually stored — the plain precache paths (or
         the exact runtime URL after an online visit). Exact query matching
         missed the precached copy for fresh installs, so match per
         pathname instead. This is version-safe by construction: one deploy
         = one cache name, and activate() above clears the previous
         deploy's cache, so a single cache can never hold old and new
         versions of the same pathname. */
      caches.match(req, { ignoreSearch: true }).then((hit) => hit
        /* The app-shell fallback is only for navigations — a script or
           stylesheet request must fail like the network would, never
           receive index.html as its body. */
        || (req.mode === 'navigate' ? caches.match('/index.html') : undefined))
    )
  );
});
