// Service Worker deployment via backend function
// This file registers and manages the service worker

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  STATIC: `rapido-static-${CACHE_VERSION}`,
  DYNAMIC: `rapido-dynamic-${CACHE_VERSION}`,
  API: `rapido-api-${CACHE_VERSION}`,
  IMAGES: `rapido-images-${CACHE_VERSION}`
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
];

const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

const URL_PATTERNS = [
  { pattern: /\.(js|css|woff2|woff|ttf|eot)$/i, strategy: CACHE_STRATEGIES.CACHE_FIRST, cache: CACHE_NAMES.STATIC },
  { pattern: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i, strategy: CACHE_STRATEGIES.CACHE_FIRST, cache: CACHE_NAMES.IMAGES },
  { pattern: /\/api\//i, strategy: CACHE_STRATEGIES.NETWORK_FIRST, cache: CACHE_NAMES.API },
  { pattern: /\.html$/i, strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE, cache: CACHE_NAMES.STATIC }
];

export const swConfig = {
  version: CACHE_VERSION,
  cacheNames: CACHE_NAMES,
  strategies: CACHE_STRATEGIES,
  urlPatterns: URL_PATTERNS,
  staticAssets: STATIC_ASSETS
};

// Getter function to retrieve SW config
Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({
      version: CACHE_VERSION,
      cacheNames: CACHE_NAMES,
      strategies: CACHE_STRATEGIES,
      configured: true
    });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});