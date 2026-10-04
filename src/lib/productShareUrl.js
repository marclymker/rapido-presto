const SITE_ORIGIN = 'https://rapidopresto.shop';

// L'ID Firestore est la clé primaire immuable. Le slug reste accepté uniquement
// pour les anciens liens qui existaient avant cette correction.
export function getProductKey(product) {
  return product?.id || product?.firebase_id || product?.slug || null;
}

export function getPublicProductPath(product) {
  const productKey = getProductKey(product);
  return productKey ? `/product/${encodeURIComponent(productKey)}` : '/';
}

export function getProductShareUrl(product, origin = SITE_ORIGIN) {
  const productKey = getProductKey(product);
  if (!productKey) return origin;
  const url = new URL('/functions/ogMetaTags', origin);
  // product=id force une résolution unique. slug est informatif/fallback seulement.
  url.searchParams.set('product', productKey);
  if (product?.slug) url.searchParams.set('slug', product.slug);
  if (product?.shop_slug) url.searchParams.set('shop', product.shop_slug);
  return url.toString();
}

export function getProductCanonicalUrl(product, origin = SITE_ORIGIN) {
  return new URL(getPublicProductPath(product), origin).toString();
}
