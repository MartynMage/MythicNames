// MythicNames service worker.
// Pages: network-first, so a deploy is picked up straight away and the cache
// is only a fallback. Static assets: cache-first. Third-party requests (ads,
// analytics, fonts) are left entirely alone.
const VERSION = 'v1';
const SHELL = 'mythic-shell-' + VERSION;
const RUNTIME = 'mythic-runtime-' + VERSION;

const PRECACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/consent.js',
    '/404.html',
    '/generators/',
    '/blog/',
    '/logo.png',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
    '/site.webmanifest'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(SHELL)
            // addAll fails the whole install if any single URL 404s, so add
            // them individually and tolerate misses.
            .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // ads, analytics, fonts

    // Pages: network first, fall back to cache, then to the offline page.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(RUNTIME).then(c => c.put(req, copy));
                    return res;
                })
                .catch(() => caches.match(req)
                    .then(hit => hit || caches.match('/index.html')))
        );
        return;
    }

    // Static assets: stale-while-revalidate. Serve the cached copy instantly,
    // but always refetch in the background so a deploy lands on the next visit
    // instead of being pinned until the cache version changes.
    event.respondWith(
        caches.match(req).then(hit => {
            const network = fetch(req).then(res => {
                if (res.ok && res.type === 'basic') {
                    const copy = res.clone();
                    caches.open(RUNTIME).then(c => c.put(req, copy));
                }
                return res;
            }).catch(() => hit);
            return hit || network;
        })
    );
});
