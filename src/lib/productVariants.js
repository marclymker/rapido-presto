export function normalizeVariant(variant, index = 0) {
  return {
    id: variant?.id || `variant-${index + 1}`,
    sku: variant?.sku || '',
    color: variant?.color || variant?.name || '',
    size: variant?.size || '',
    price: Number(variant?.price || 0),
    promo_price: Number(variant?.promo_price || 0),
    stock_quantity: Number.isFinite(Number(variant?.stock_quantity)) ? Number(variant.stock_quantity) : null,
    image_url: variant?.image_url || '',
    additional_images: Array.isArray(variant?.additional_images) ? variant.additional_images.filter(Boolean) : [],
    is_available: variant?.is_available !== false,
  };
}

export function getProductVariants(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants.map(normalizeVariant).filter(v => v.color || v.size || v.price || v.image_url);
}

export function getVariantImages(product, variant) {
  return [variant?.image_url, ...(variant?.additional_images || []), product?.image_url, ...(product?.additional_images || [])].filter(Boolean);
}

export function getVariantPrice(product, variant) {
  const raw = variant?.promo_price || variant?.price || product?.promo_price || product?.price || 0;
  return Number(raw);
}
