/**
 * Génère automatiquement le SEO pour n'importe quel produit
 */

const CITY_BY_REGION = {
  'Port-au-Prince': 'Port-au-Prince',
  'Cap-Haïtien': 'Cap-Haïtien',
  'Pétion-Ville': 'Pétion-Ville',
  'Delmas': 'Delmas',
  'Carrefour': 'Carrefour',
  'Jacmel': 'Jacmel',
  'Les Cayes': 'Les Cayes',
};

const CATEGORY_KEYWORDS = {
  'Pour Femme': 'mode femme tendance',
  'Bijoux': 'bijoux élégants accessoires',
  'Pour homme': 'mode homme style',
  'Mariage': 'mariage cérémonie élégant',
  'Maison': 'décoration maison intérieur',
  'Electronics': 'électronique technologie',
  'Fastfood': 'restauration rapide livraison',
  'Restaurants': 'restaurant gastronomie',
  'Boutique Fleurs': 'fleurs bouquet cadeau',
  'Pharmacie': 'santé pharmacie médicament',
  'Epicerie': 'épicerie alimentation courses',
  'Café': 'café boisson hot drink',
  'Bébé': 'bébé enfant puériculture',
  'Outils': 'outils bricolage construction',
  'Bijoux': 'bijoux accessoires mode',
  'Matériels Décor': 'décoration événement matériels',
};

const EVENT_BY_CATEGORY = {
  'Mariage': 'mariage et cérémonies',
  'Pour Femme': 'soirées et événements',
  'Bijoux': 'occasions spéciales',
  'Pour homme': 'occasions formelles',
  'Maison': 'la décoration intérieure',
  'Bébé': 'votre bébé',
};

export function generateProductSEO(product, shop) {
  const category = product.category || '';
  const name = product.name || '';
  const region = shop?.region || 'Haïti';
  const city = CITY_BY_REGION[region] || region || 'Haïti';
  const catKw = CATEGORY_KEYWORDS[category] || category;
  const event = EVENT_BY_CATEGORY[category] || 'toutes occasions';

  const title = `${name} - ${catKw} Haïti ${city} | Rapido Presto`;

  const price = product.promo_price || product.price;
  const description = product.description
    ? `${product.description.slice(0, 120)}. Prix: ${price?.toLocaleString()} HTG. Livraison rapide à ${city}, Haïti.`
    : `${name} — ${catKw}. Idéal pour ${event}. Élégant, moderne et tendance. Prix: ${price?.toLocaleString()} HTG. Livraison rapide à ${city}, Haïti avec Rapido Presto.`;

  const keywords = [
    name.toLowerCase(),
    category.toLowerCase(),
    catKw,
    city,
    'Haïti',
    'livraison rapide',
    'Rapido Presto',
    shop?.company_name || '',
  ].filter(Boolean).join(', ');

  return { title, description, keywords, city, event };
}