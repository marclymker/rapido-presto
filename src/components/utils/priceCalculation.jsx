/**
 * Ajoute la marge de 10% sur le prix défini par la boutique
 * @param {number} price - Prix de base
 * @returns {number} - Prix avec marge arrondi
 */
export function applyClientMargin(price) {
  if (!price || price <= 0) return 0;
  return Math.round(price * 1.1);
}

/**
 * Calcule le prix à afficher au client (avec marge)
 * Prend en compte le prix promo si disponible
 * @param {Object} product - Produit avec price et promo_price
 * @returns {number} - Prix final avec marge
 */
export function getClientPrice(product) {
  const basePrice = product.promo_price && product.promo_price < product.price
    ? product.promo_price
    : product.price;
  
  return applyClientMargin(basePrice);
}