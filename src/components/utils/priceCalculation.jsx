/**
 * Utilitaires de prix client (avec marge plateforme de 10%)
 * Certaines boutiques sont exemptées de la marge (ex: MAKARIOS BRIDAL).
 */

const normalizeShop = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Boutiques exemptées de la marge de 10% (match sur le nom de boutique)
const MARGIN_EXEMPT_TOKENS = ['makarios bridal', 'makarios'];

export function isMarginExemptShop(shopName) {
  const n = normalizeShop(shopName);
  if (!n) return false;
  return MARGIN_EXEMPT_TOKENS.some(t => n.includes(t));
}

/**
 * Ajoute la marge de 10% sur le prix défini par la boutique.
 * @param {number} price - Prix de base
 * @param {string} [shopName] - Nom de la boutique (pour exemption)
 * @returns {number} - Prix avec marge arrondi
 */
export function applyClientMargin(price, shopName) {
  if (!price || price <= 0) return 0;
  if (isMarginExemptShop(shopName)) return Math.round(price);
  return Math.round(price * 1.1);
}

/**
 * Calcule le prix à afficher au client (avec marge, sauf exemption)
 * Prend en compte le prix promo si disponible
 * @param {Object} product - Produit avec price, promo_price et shop_name
 * @returns {number} - Prix final avec marge
 */
export function getClientPrice(product) {
  const basePrice = product.promo_price && product.promo_price < product.price
    ? product.promo_price
    : product.price;

  return applyClientMargin(basePrice, product.shop_name);
}