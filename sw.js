// MythicNames service worker.
// Pages: network-first, so a deploy is picked up straight away and the cache
// is only a fallback. Static assets: stale-while-revalidate. Third-party
// requests (ads, analytics, fonts) are left entirely alone.
// Bump on any change to PRECACHE or to a long-cached asset (styles.css,
// consent.js) — activate deletes every cache that is not on the current
// version, so returning visitors pick the new files up on their next visit.
const VERSION = 'v16';
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
    // Saved names live in localStorage, so this page is fully usable offline.
    '/favourites',
    '/logo-192.webp',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
    '/site.webmanifest'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(SHELL)
            // addAll fails the whole install if any single URL 404s, so add
            // them individually and tolerate misses. cache:'reload' skips the
            // browser HTTP cache — without it a deploy that lands inside
            // styles.css's max-age would precache the previous file and pin it
            // for the whole of this version.
            .then(cache => Promise.all(PRECACHE.map(url =>
                cache.add(new Request(url, {cache: 'reload'})).catch(() => {})
            )))
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

    // Never cache the edge functions. /api/geo is per-visitor: a cached copy
    // would hand one country's answer to the next person on that device.
    if (url.pathname.startsWith('/api/')) return;

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
    //
    // Look in RUNTIME before SHELL. A bare caches.match() searches the caches in
    // creation order, so it would keep handing back the copy precached at
    // install time and the background refresh below — which writes to RUNTIME —
    // would never be seen. That pinned styles.css to whatever was precached and
    // broke the header everywhere except the homepage, which inlines its own.
    // caches.open creates RUNTIME if this is the first asset of the version;
    // matching it by name alone would reject before it exists.
    event.respondWith(
        caches.open(RUNTIME)
            .then(runtime => runtime.match(req).then(hit => hit || caches.match(req)))
            .then(hit => {
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
