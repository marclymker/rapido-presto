export const MARKETPLACE_SPACES = [
  { id: 'Marketplace', label: 'MarketPlace', icon: '🛍️' },
  { id: 'Nourriture', label: 'Nourriture', icon: '🍔' },
  { id: 'Hotels/Piscine', label: 'Hotels / Piscine', icon: '🏨' },
  { id: 'Tickets', label: 'Tickets', icon: '🎟️' },
];

export function getMarketplaceSpacePath(spaceId) {
  return {
    Marketplace: '/marketplace',
    Nourriture: '/nourriture',
    'Hotels/Piscine': '/hotel-piscine',
    Tickets: '/tickets',
  }[spaceId] || '/marketplace';
}

const FOOD_CATEGORIES = new Set([
  'nourriture', 'fastfood', 'fast food', 'restaurant', 'restaurants',
  'cafe', 'café', 'boulangerie', 'epicerie', 'épicerie', 'traiteur',
]);

const normalizeSpaceValue = (value = '') => String(value)
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\s_/-]+/g, ' ');

export function mapToMarketplaceSpace(value) {
  const normalized = normalizeSpaceValue(value);
  if (!normalized) return null;
  if (['hospitality', 'hotel', 'hotels', 'hotel piscine', 'hotels piscine', 'piscine'].includes(normalized)) return 'Hotels/Piscine';
  if (['tickets', 'ticket', 'ticket / evenements', 'evenement', 'evenements', 'billetterie'].includes(normalized) || normalized.startsWith('ticket')) return 'Tickets';
  if (FOOD_CATEGORIES.has(normalized) || normalized.includes('restaurant') || normalized.includes('food')) return 'Nourriture';
  if (['marketplace', 'client', 'entreprise', 'commerce', 'marchand', 'boutique'].includes(normalized)) return 'Marketplace';
  return null;
}

/**
 * Détermine l'espace public d'un article.
 * Le profil métier actif et la catégorie de la boutique dominent la catégorie
 * libre saisie dans le formulaire, ce qui évite qu'un article Restaurant tombe
 * dans Marketplace à cause d'une ancienne valeur comme « Mode ».
 */
export function getMarketplaceSpace(product = {}, shop = null) {
  const profile = product.business_profile || product.profile_type || product.current_profile
    || shop?.business_profile || shop?.profile_type || shop?.current_profile;
  const profileSpace = mapToMarketplaceSpace(profile);
  if (profileSpace && profileSpace !== 'Marketplace') return profileSpace;

  const shopSpace = mapToMarketplaceSpace(product.shop_category || shop?.company_category);
  if (shopSpace && shopSpace !== 'Marketplace') return shopSpace;

  return mapToMarketplaceSpace(product.marketplace_space)
    || mapToMarketplaceSpace(product.space)
    || mapToMarketplaceSpace(product.category)
    || 'Marketplace';
}
