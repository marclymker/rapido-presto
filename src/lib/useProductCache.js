/**
 * Cache de produits vus dans localStorage
 * Permet la consultation offline des fiches produits visitées
 */

const CACHE_KEY    = 'rp_product_cache';
const MAX_PRODUCTS = 50; // Max produits gardés en cache

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full — clear half and retry
    const entries = Object.entries(data);
    const trimmed = Object.fromEntries(entries.slice(-Math.floor(MAX_PRODUCTS / 2)));
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed)); } catch {}
  }
}

/** Sauvegarde un produit (+ sa boutique) dans le cache */
export function cacheProduct(product, shop = null) {
  if (!product?.id) return;
  const cache = readCache();

  // Trim si trop plein
  const ids = Object.keys(cache);
  if (ids.length >= MAX_PRODUCTS) {
    // Remove oldest (first keys)
    ids.slice(0, ids.length - MAX_PRODUCTS + 1).forEach((id) => delete cache[id]);
  }

  cache[product.id] = {
    product,
    shop: shop || null,
    cachedAt: Date.now(),
  };

  // Also index by slug
  if (product.slug && product.slug !== product.id) {
    cache[`slug:${product.slug}`] = product.id; // reference to id
  }

  writeCache(cache);
}

/** Récupère un produit depuis le cache (par id ou slug) */
export function getCachedProduct(slugOrId) {
  if (!slugOrId) return null;
  const cache = readCache();

  // Direct id lookup
  if (cache[slugOrId]?.product) return cache[slugOrId];

  // Slug lookup
  const refId = cache[`slug:${slugOrId}`];
  if (refId && cache[refId]?.product) return cache[refId];

  return null;
}

/** Retourne tous les produits cachés (pour une page offline) */
export function getAllCachedProducts() {
  const cache = readCache();
  return Object.values(cache)
    .filter((v) => v?.product)
    .sort((a, b) => b.cachedAt - a.cachedAt);
}
