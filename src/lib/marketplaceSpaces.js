export const MARKETPLACE_SPACES = [
  { id: 'Marketplace', label: 'MarketPlace', icon: '🛍️' },
  { id: 'Nourriture', label: 'Nourriture', icon: '🍔' },
  { id: 'Hotels/Piscine', label: 'Hotels / Piscine', icon: '🏨' },
  { id: 'Tickets', label: 'Tickets', icon: '🎟️' },
];

const FOOD_CATEGORIES = new Set([
  'Nourriture', 'Fastfood', 'Fast Food', 'Restaurant', 'Restaurants',
  'Café', 'Boulangerie', 'Epicerie', 'Épicerie', 'Traiteur',
]);

export function getMarketplaceSpace(product) {
  const category = String(product?.category || '').trim();
  if (category === 'Hotels/Piscine') return 'Hotels/Piscine';
  if (category === 'Tickets' || category.toLowerCase().startsWith('ticket')) return 'Tickets';
  if (FOOD_CATEGORIES.has(category) || FOOD_CATEGORIES.has(category.replace(/é/g, 'e'))) return 'Nourriture';
  return 'Marketplace';
}
