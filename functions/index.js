const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2/options');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });
const db = admin.firestore();
const SITE_ORIGIN = 'https://rapidopresto.shop';
const CRAWLER_RE = /facebookexternalhit|facebot|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot/i;

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function absoluteUrl(value) {
  if (!value) return `${SITE_ORIGIN}/icons/rapido-presto.svg`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return new URL(value, SITE_ORIGIN).toString();
}

async function findProduct(productKey) {
  if (!productKey) return null;
  const byId = await db.collection('Product').doc(productKey).get();
  if (byId.exists) return { id: byId.id, ...byId.data() };
  const bySlug = await db.collection('Product').where('slug', '==', productKey).limit(2).get();
  if (bySlug.size !== 1) return null;
  const item = bySlug.docs[0];
  return { id: item.id, ...item.data() };
}

async function findShop(product, shopKey) {
  if (product?.shop_id) {
    const shop = await db.collection('Shop').doc(product.shop_id).get();
    if (shop.exists) return { id: shop.id, ...shop.data() };
  }
  if (shopKey) {
    const shops = await db.collection('Shop').where('slug', '==', shopKey).limit(1).get();
    if (!shops.empty) {
      const shop = shops.docs[0];
      return { id: shop.id, ...shop.data() };
    }
  }
  return null;
}

function renderMetadata({ product, shop, canonicalUrl }) {
  const name = product?.name || 'Produit sur Rapido Presto';
  const shopName = shop?.company_name || product?.shop_name || 'Rapido Presto';
  const price = product?.promo_price || product?.price;
  const priceText = price ? ` — ${price} HTG` : '';
  const description = (product?.seo_description || product?.description || `Découvrez ${name} chez ${shopName} sur Rapido Presto.`).replace(/\s+/g, ' ').trim().slice(0, 300);
  const image = absoluteUrl(product?.image_url || product?.cover_image_url || product?.images?.[0]);
  const title = `${name}${priceText} | ${shopName} | Rapido Presto`;
  const safe = { title: escapeHtml(title), description: escapeHtml(description), image: escapeHtml(image), url: escapeHtml(canonicalUrl), name: escapeHtml(name) };
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safe.title}</title><meta name="description" content="${safe.description}"><link rel="canonical" href="${safe.url}"><meta property="og:type" content="product"><meta property="og:site_name" content="Rapido Presto"><meta property="og:locale" content="fr_HT"><meta property="og:title" content="${safe.title}"><meta property="og:description" content="${safe.description}"><meta property="og:url" content="${safe.url}"><meta property="og:image" content="${safe.image}"><meta property="og:image:secure_url" content="${safe.image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${safe.name}"><meta property="product:price:amount" content="${escapeHtml(price || '')}"><meta property="product:price:currency" content="HTG"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${safe.title}"><meta name="twitter:description" content="${safe.description}"><meta name="twitter:image" content="${safe.image}"></head><body><h1>${safe.name}</h1><p>${safe.description}</p><p><a href="${safe.url}">Voir le produit sur Rapido Presto</a></p><script>window.location.replace(${JSON.stringify(canonicalUrl)});</script></body></html>`;
}

exports.ogMetaTags = onRequest({ cors: false }, async (req, res) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'public, max-age=300, s-maxage=900');
  const productKey = String(req.query.product || req.query.productId || req.query.productSlug || req.query.id || req.query.slug || '').trim();
  const shopKey = String(req.query.shop || req.query.shopSlug || (req.query.product ? req.query.slug : '')).trim();
  try {
    const product = await findProduct(productKey);
    if (!product) {
      res.status(404).send(renderMetadata({ canonicalUrl: `${SITE_ORIGIN}/`, product: { name: 'Produit introuvable', description: 'Ce produit n’est plus disponible sur Rapido Presto.' } }));
      return;
    }
    const shop = await findShop(product, shopKey);
    const canonicalUrl = `${SITE_ORIGIN}/product/${encodeURIComponent(product.id)}`;
    if (!CRAWLER_RE.test(req.get('user-agent') || '')) {
      res.redirect(302, canonicalUrl);
      return;
    }
    res.status(200).type('html').send(renderMetadata({ product, shop, canonicalUrl }));
  } catch (error) {
    console.error('ogMetaTags error', error);
    res.status(500).send('Unable to generate product preview');
  }
});
