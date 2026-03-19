/**
 * Optimise une URL d'image Supabase pour la rendre plus légère
 * Ajoute la transformation WebP + compression + resize automatique
 */
export function optimizeImage(url, { width = 400, quality = 70 } = {}) {
  if (!url) return url;
  
  // Supabase Storage image transformation
  // Format: /storage/v1/object/public/... → /storage/v1/render/image/public/...
  if (url.includes('/storage/v1/object/public/')) {
    const optimized = url
      .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      + `?width=${width}&quality=${quality}&format=webp`;
    return optimized;
  }

  // Pour les URLs externes (unsplash, etc.) — on ne peut pas transformer
  return url;
}

/**
 * Optimise pour la grille produit (thumbnail 400px)
 */
export function productThumbnail(url) {
  return optimizeImage(url, { width: 400, quality: 70 });
}

/**
 * Optimise pour le modal produit (grande image 800px)
 */
export function productFullImage(url) {
  return optimizeImage(url, { width: 800, quality: 80 });
}