const SITE_ORIGIN = 'https://rapidopresto.shop';

export function getPublicProductPath(product) {
  const productSlug = product?.slug || product?.id;
  return productSlug ? `/product/${encodeURIComponent(productSlug)}` : '/';
}

export function getProductShareUrl(product, origin = SITE_ORIGIN) {
  const productSlug = product?.slug || product?.id;
  if (!productSlug) return origin;
  const url = new URL('/functions/ogMetaTags', origin);
  url.searchParams.set('slug', productSlug);
  url.searchParams.set('product', productSlug);
  if (product?.shop_slug) url.searchParams.set('shop', product.shop_slug);
  return url.toString();
}

export function getProductCanonicalUrl(product, origin = SITE_ORIGIN) {
  return new URL(getPublicProductPath(product), origin).toString();
}
