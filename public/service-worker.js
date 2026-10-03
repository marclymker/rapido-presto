// ============================================================
// Rapido Presto — Service Worker v5
// Optimisé pour connexions lentes (Haïti)
// ============================================================

const CACHE_VERSION = 'rp-v5'; // purge le build précédent qui contenait le tracker legacy
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;
const PAGE_CACHE    = `${CACHE_VERSION}-pages`;

// Assets statiques à précacher dès l'installation
const PRECACHE_URLS = [
  '/offline.html',
];

// ─── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignore failures for individual assets
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate — Purge old caches ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('rp-') && !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Ignorer chrome-extension://, data:, etc. (cache.put les refuse)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // ── API calls → Network First (fallback: nothing cached)
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(request, PAGE_CACHE, 4000));
    return;
  }

  // ── Images → Cache First (saves bandwidth on slow connections)
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, 200));
    return;
  }

  // ── Static assets (JS, CSS, fonts) → Cache First
  if (/\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 500));
    return;
  }

  // ── Navigation (HTML pages) → Network First (jamais de vieux index.html)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(request)) || offlineFallback())
    );
    return;
  }
});

// ─── Background Sync (panier offline) ─────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCartQueue());
  }
});

async function syncCartQueue() {
  // Notify all clients to process the queue
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: 'PROCESS_CART_QUEUE' }));
}

// ─── Message handler ──────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAN_CACHE') {
    trimImageCache();
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function trimImageCache() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys  = await cache.keys();
  if (keys.length > 200) {
    // Delete oldest 50 entries
    await Promise.all(keys.slice(0, 50).map((k) => cache.delete(k)));
  }
}

// ─── Strategies ───────────────────────────────────────────

/** Cache First — serve from cache, update in background */
async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const type = response.headers.get('content-type') || '';
    // Un fichier manquant renvoie index.html (text/html) avec un code 200 : ne jamais le mémoriser
    if (response.ok && !type.includes('text/html')) {
      cache.put(request, response.clone()).catch(() => {});
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

/** Stale While Revalidate — serve cache instantly, update in background */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise || offlineFallback();
}

/** Network First — try network, fall back to cache */
async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(tid);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ offline: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }
}

async function offlineFallback() {
  const cache = await caches.open(STATIC_CACHE);
  return (await cache.match('/offline.html')) || new Response('Offline', { status: 503 });
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
  }
}
