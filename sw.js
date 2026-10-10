/* Bandly AI — service worker */
const CACHE = 'bandly-v18';
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
      caches.match(req).then((hit) => hit || caches.match('/index.html'))
    )
  );
});
