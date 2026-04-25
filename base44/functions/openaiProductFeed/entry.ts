import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = Deno.env.get('APP_URL') || 'https://rapidopresto.shop';

// Mapping catégories internes → Google Product Category ID
const GOOGLE_CATEGORY_MAP = {
  'Pour Femme':       '1604',   // Apparel & Accessories > Clothing
  'Pour homme':       '1604',
  'Mode':             '1604',
  'Mariage':          '5388',   // Apparel & Accessories > Clothing > Wedding & Bridal Party Dresses
  'Bijoux':           '188',    // Apparel & Accessories > Jewelry
  'Boutique Fleurs':  '984',    // Home & Garden > Flowers
  'Electronics':      '222',    // Electronics
  'Pharmacie':        '491',    // Health & Beauty
  'Epicerie':         '422',    // Food, Beverages & Tobacco
  'Café':             '422',
  'Maison':           '536',    // Furniture
  'Bébé':             '537',    // Baby & Toddler
  'Outils':           '1167',   // Hardware
  'Matériels Décor':  '536',
  'Fastfood':         '422',
  'Tickets':          '8',      // Arts & Entertainment > Event Tickets
};

// Delivery fee estimée par taille d'emballage
const DELIVERY_FEE_MAP = {
  'Petit':       '250 HTG',
  'Moyen':       '350 HTG',
  'Grand':       '500 HTG',
  'Lourd':       '750 HTG',
  'Encombrant':  '1000 HTG',
};

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function applyClientMargin(price) {
  if (!price || price <= 0) return 0;
  return Math.round(price * 1.1);
}

function getBrand(shopName, category) {
  if (!shopName) return 'RAPIDOPRESTO';
  const lower = (shopName || '').toLowerCase();
  if (lower.includes('makarios') || lower.includes('bridal')) return 'MAKARIOS BRIDAL DREAM';
  if (category === 'Mariage') return 'MAKARIOS BRIDAL DREAM';
  return 'RAPIDOPRESTO';
}

function buildEnrichedTitle(product, shop) {
  const brand = getBrand(shop?.company_name, product.category);
  const base = product.name || '';

  // Enrichissement selon catégorie
  const enrichments = {
    'Mariage':        `| Robe & Tenue Mariage Haïti 💍 | Bèl Rad Mariaj pou Okazyon Espesyal`,
    'Bijoux':         `| Bijoux Élégants Haïti 💎 | Bon Kalite pou Fèt & Soti`,
    'Pour Femme':     `| Mode Femme Haïti 👗 | Chic pou Soti, Fèt & Jounen Travay`,
    'Pour homme':     `| Mode Homme Haïti 👔 | Style pou Travay, Soti & Selebrasyon`,
    'Boutique Fleurs':`| Fleurs Fraîches Haïti 🌸 | Livraison Port-au-Prince & Cap-Haïtien`,
    'Electronics':    `| Tech & Électronique Haïti 📱 | Garanti & Livraison Rapide`,
    'Fastfood':       `| Commande en Ligne Haïti 🍔 | Livraison 30-45 min`,
    'Epicerie':       `| Épicerie Haïti 🛒 | Livraison Rapide à Domicile`,
  };

  const suffix = enrichments[product.category] || `| ${brand} | Livraison Haïti`;
  return `${base} ${suffix}`;
}

function buildEnrichedDescription(product, shop) {
  const brand = getBrand(shop?.company_name, product.category);
  const cities = 'Port-au-Prince, Pétion-Ville, Delmas, Cap-Haïtien, Gonaïves';
  const base = product.description || product.name || '';
  const price = applyClientMargin(product.promo_price || product.price);

  const scenarios = {
    'Mariage':        `Parfait pour mariages, fiançailles & cérémonies religieuses en Haïti. Disponible chez ${brand}. Commandez maintenant et recevez-le à ${cities}. 💍`,
    'Bijoux':         `Bijoux de qualité pour fêtes, mariages, graduations & sorties chic en Haïti. Livraison express ${cities}. 💎`,
    'Pour Femme':     `Tenue féminine élégante pour sorties, fêtes & occasions spéciales. Livré rapidement à ${cities}. 👗`,
    'Pour homme':     `Style masculin pour bureau, cérémonie & selebrasyon. Livraison ${cities}. 👔`,
    'Boutique Fleurs':`Fleurs fraîches livrées le jour même à ${cities}. Idéal pour anniversaires, mariages & cadeaux. 🌸`,
    'Electronics':    `Produit tech de qualité avec livraison rapide à travers Haïti. ${cities}. 📱`,
    'Fastfood':       `Commandez en ligne et recevez en 30-45 minutes. Livraison disponible à ${cities}. 🍔`,
    'Epicerie':       `Courses livrées à domicile. ${cities}. 🛒`,
  };

  const scenarioText = scenarios[product.category] || `Disponible sur RAPIDOPRESTO, livraison rapide à ${cities}.`;

  return `${base}\n\n${scenarioText}\n\n💰 Prix : ${price.toLocaleString()} HTG | Boutique : ${shop?.company_name || brand} | Livraison disponible partout en Haïti.`;
}

function buildProductItem(product, shop) {
  const clientPrice = applyClientMargin(product.promo_price || product.price);
  const originalPrice = applyClientMargin(product.price);
  const availability = product.is_available !== false && (product.stock_quantity === undefined || product.stock_quantity > 0)
    ? 'in stock'
    : 'out of stock';

  const slug = product.slug || product.id;
  const productUrl = `${APP_URL}/product/${encodeURIComponent(slug)}`;
  const brand = getBrand(shop?.company_name, product.category);
  const googleCat = GOOGLE_CATEGORY_MAP[product.category] || '1604';
  const deliveryFee = DELIVERY_FEE_MAP[product.taille_emballage] || '350 HTG';
  const enrichedTitle = buildEnrichedTitle(product, shop);
  const enrichedDescription = buildEnrichedDescription(product, shop);
  const attrs = product.product_attributes || {};

  let xml = `
    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(enrichedTitle)}</g:title>
      <g:description>${escapeXml(enrichedDescription)}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(product.image_url || '')}</g:image_link>`;

  // Images additionnelles
  if (product.additional_images?.length > 0) {
    product.additional_images.slice(0, 9).forEach(img => {
      xml += `\n      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`;
    });
  }

  xml += `
      <g:price>${clientPrice} HTG</g:price>`;

  // Prix de vente si promo
  if (product.promo_price && product.promo_price < product.price) {
    xml += `
      <g:sale_price>${clientPrice} HTG</g:sale_price>
      <g:sale_price_effective_date>2026-01-01T00:00+00:00/2030-12-31T23:59+00:00</g:sale_price_effective_date>`;
  }

  xml += `
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:google_product_category>${googleCat}</g:google_product_category>
      <g:product_type>${escapeXml(product.category || 'Divers')}</g:product_type>`;

  // MPN (ID comme référence produit)
  xml += `
      <g:mpn>${escapeXml(product.id)}</g:mpn>`;

  // Variantes / attributs
  if (attrs.color) xml += `\n      <g:color>${escapeXml(attrs.color)}</g:color>`;
  if (attrs.size) xml += `\n      <g:size>${escapeXml(attrs.size)}</g:size>`;
  if (attrs.material) xml += `\n      <g:material>${escapeXml(attrs.material)}</g:material>`;
  if (attrs.gender) xml += `\n      <g:gender>${escapeXml(attrs.gender)}</g:gender>`;
  if (attrs.age_group) xml += `\n      <g:age_group>${escapeXml(attrs.age_group)}</g:age_group>`;

  // Subcategory / item_group pour variantes mariage
  if (product.subcategory) {
    xml += `\n      <g:item_group_id>${escapeXml(product.category + '_' + product.subcategory)}</g:item_group_id>`;
  }

  // Custom labels
  const labels = attrs.custom_labels || {};
  const seoTags = (product.seo_tags || []).slice(0, 5).join(', ');
  xml += `
      <g:custom_label_0>${escapeXml(product.category || '')}</g:custom_label_0>
      <g:custom_label_1>${escapeXml(product.subcategory || product.delivery_time || '')}</g:custom_label_1>
      <g:custom_label_2>${escapeXml(seoTags)}</g:custom_label_2>
      <g:custom_label_3>${escapeXml(labels.label_0 || brand)}</g:custom_label_3>
      <g:custom_label_4>${escapeXml(shop?.region || 'Haiti')}</g:custom_label_4>`;

  // Livraison
  xml += `
      <g:shipping>
        <g:country>HT</g:country>
        <g:service>${product.delivery_time === '30-45 minutes' ? 'Express' : 'Standard'}</g:service>
        <g:price>${deliveryFee}</g:price>
      </g:shipping>
    </item>`;

  return xml;
}

Deno.serve(async (req) => {
  // CORS pour robots/crawlers
  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    'Access-Control-Allow-Origin': '*',
    'X-Robots-Tag': 'index, follow',
  };

  try {
    const base44 = createClientFromRequest(req);

    // Fetch tous les produits actifs + boutiques
    const [products, shops] = await Promise.all([
      base44.asServiceRole.entities.Product.filter({ is_available: true }, '-created_date', 2000),
      base44.asServiceRole.entities.Shop.filter({ is_active: true }),
    ]);

    // Map shops par id
    const shopsMap = {};
    shops.forEach(s => { shopsMap[s.id] = s; });

    const now = new Date().toUTCString();
    const totalProducts = products.length;

    let itemsXml = '';
    for (const product of products) {
      if (!product.name || !product.price) continue;
      const shop = shopsMap[product.shop_id];
      itemsXml += buildProductItem(product, shop);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>RAPIDOPRESTO - Marketplace Haïti | MAKARIOS BRIDAL DREAM</title>
    <link>${APP_URL}</link>
    <description>Flux produit officiel de RAPIDOPRESTO.SHOP — Marketplace e-commerce en Haïti. Mode, Mariage, Fleurs, Electronics et plus. Livraison rapide Port-au-Prince, Cap-Haïtien, Gonaïves.</description>
    <language>fr-HT</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>RAPIDOPRESTO Product Feed v2.0</generator>
    <totalResults>${totalProducts}</totalResults>
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(xml, { status: 200, headers });

  } catch (error) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>${escapeXml(error.message)}</error>`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
});