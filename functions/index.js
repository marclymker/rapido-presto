const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2/options');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10, invoker: 'public' });
const db = admin.firestore();
const SITE_ORIGIN = 'https://makariosbridal.shop';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/icons/rapido-presto.svg`;
const PUBLIC_LIMIT = 1000;

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function absoluteUrl(value) {
  if (!value) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.startsWith('/') ? value : `/${value}`, SITE_ORIGIN).toString();
}

function setXmlHeaders(res, maxAge = 900) {
  res.status(200).type('application/xml; charset=utf-8');
  res.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge * 4}`);
  res.set('X-Content-Type-Options', 'nosniff');
}

function setJsonHeaders(res, maxAge = 300) {
  res.status(200).type('application/json; charset=utf-8');
  res.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge * 4}`);
  res.set('X-Content-Type-Options', 'nosniff');
}

function productImage(product) {
  return absoluteUrl(product.image_url || product.cover_image_url || product.images?.[0] || product.image);
}

function productUrl(product) {
  return `${SITE_ORIGIN}/product/${encodeURIComponent(product.id)}`;
}

function productDescription(product) {
  return String(product.seo_description || product.description || product.name || 'Produit disponible sur Kairos')
    .replace(/\s+/g, ' ').trim().slice(0, 5000);
}

async function getPublicProducts(limit = PUBLIC_LIMIT) {
  const snapshot = await db.collection('Product').limit(Math.min(limit, PUBLIC_LIMIT)).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((product) => product.is_available !== false && product.is_active !== false && product.is_published !== false);
}

async function getPublicShops(limit = PUBLIC_LIMIT) {
  const snapshot = await db.collection('Shop').limit(Math.min(limit, PUBLIC_LIMIT)).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((shop) => shop.is_active !== false && shop.is_published !== false);
}

async function findProduct(productKey) {
  if (!productKey) return null;
  const byId = await db.collection('Product').doc(productKey).get();
  if (byId.exists) return { id: byId.id, ...byId.data() };
  const bySlug = await db.collection('Product').where('slug', '==', productKey).limit(2).get();
  if (bySlug.size !== 1) return null;
  return { id: bySlug.docs[0].id, ...bySlug.docs[0].data() };
}

async function findShop(product, shopKey) {
  if (product?.shop_id) {
    const shop = await db.collection('Shop').doc(product.shop_id).get();
    if (shop.exists) return { id: shop.id, ...shop.data() };
  }
  if (!shopKey) return null;
  const shops = await db.collection('Shop').where('slug', '==', shopKey).limit(1).get();
  return shops.empty ? null : { id: shops.docs[0].id, ...shops.docs[0].data() };
}

function renderMetadata({ product, shop, canonicalUrl }) {
  const name = product?.name || 'Produit sur Kairos';
  const shopName = shop?.company_name || product?.shop_name || 'Kairos';
  const price = product?.promo_price || product?.price || '';
  const description = productDescription(product);
  const image = productImage(product);
  const title = `${name}${price ? ` — ${price} HTG` : ''} | ${shopName} | Kairos — powered by makariosbridal.shop`;
  const safe = { title: escapeHtml(title), description: escapeHtml(description), image: escapeHtml(image), url: escapeHtml(canonicalUrl), name: escapeHtml(name) };
  return `<!doctype html><html lang="fr-HT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safe.title}</title><meta name="description" content="${safe.description}"><meta name="publisher" content="Kairos — powered by makariosbridal.shop"><link rel="canonical" href="${safe.url}"><meta property="og:type" content="product"><meta property="og:site_name" content="Kairos — powered by makariosbridal.shop"><meta property="og:locale" content="fr_HT"><meta property="og:title" content="${safe.title}"><meta property="og:description" content="${safe.description}"><meta property="og:url" content="${safe.url}"><meta property="og:image" content="${safe.image}"><meta property="og:image:secure_url" content="${safe.image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${safe.name}"><meta property="product:price:amount" content="${escapeHtml(price)}"><meta property="product:price:currency" content="HTG"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${safe.title}"><meta name="twitter:description" content="${safe.description}"><meta name="twitter:image" content="${safe.image}"></head><body><h1>${safe.name}</h1><p>${safe.description}</p><p>Powered by makariosbridal.shop</p><p><a href="${safe.url}">Voir le produit sur Kairos</a></p><script>window.location.replace(${JSON.stringify(canonicalUrl)});</script></body></html>`;
}

exports.ogMetaTags = onRequest({ cors: false }, async (req, res) => {
  const key = String(req.query.product || req.query.productId || req.query.productSlug || req.query.id || req.query.slug || '').trim();
  try {
    const product = await findProduct(key);
    if (!product) return res.status(404).send('Produit introuvable');
    const shop = await findShop(product, String(req.query.shop || req.query.shopSlug || ''));
    const canonicalUrl = productUrl(product);
    const crawler = /facebookexternalhit|facebot|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot/i.test(req.get('user-agent') || '');
    if (!crawler) return res.redirect(302, canonicalUrl);
    return res.status(200).type('html').send(renderMetadata({ product, shop, canonicalUrl }));
  } catch (error) {
    console.error('ogMetaTags', error);
    return res.status(500).send('Unable to generate product preview');
  }
});

exports.generateSitemapXML = onRequest(async (_req, res) => {
  try {
    const [products, shops] = await Promise.all([getPublicProducts(), getPublicShops()]);
    const staticPaths = ['/', '/Products', '/Category', '/Blog', '/robe-de-mariage-haiti', '/wedding-planner-haiti', '/event-planner-haiti'];
    const urls = [...staticPaths.map((path) => ({ loc: `${SITE_ORIGIN}${path}` })), ...products.map((p) => ({ loc: productUrl(p), lastmod: p.updated_date || p.created_date })), ...shops.map((s) => ({ loc: `${SITE_ORIGIN}/shop/${encodeURIComponent(s.id)}`, lastmod: s.updated_date || s.created_date }))];
    const body = urls.map(({ loc, lastmod }) => `<url><loc>${escapeXml(loc)}</loc>${lastmod?.toDate ? `<lastmod>${lastmod.toDate().toISOString()}</lastmod>` : ''}<changefreq>daily</changefreq><priority>${loc === SITE_ORIGIN + '/' ? '1.0' : '0.7'}</priority></url>`).join('');
    setXmlHeaders(res, 900);
    return res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
  } catch (error) {
    console.error('generateSitemapXML', error);
    return res.status(500).type('text').send('Sitemap generation failed');
  }
});

exports.generateSitemap = exports.generateSitemapXML;

exports.googleMerchantFeed = onRequest(async (_req, res) => {
  try {
    const products = await getPublicProducts();
    const items = products.map((product) => {
      const price = Number(product.promo_price || product.price || 0).toFixed(2);
      const availability = product.stock_quantity === 0 || product.is_available === false ? 'out of stock' : 'in stock';
      return `<item><g:id>${escapeXml(product.id)}</g:id><g:title>${escapeXml(product.name || 'Produit')}</g:title><g:description>${escapeXml(productDescription(product))}</g:description><g:link>${escapeXml(productUrl(product))}</g:link><g:image_link>${escapeXml(productImage(product))}</g:image_link><g:availability>${availability}</g:availability><g:price>${price} HTG</g:price><g:condition>new</g:condition><g:brand>Kairos</g:brand><g:identifier_exists>no</g:identifier_exists></item>`;
    }).join('');
    setXmlHeaders(res, 900);
    return res.send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Kairos Haïti</title><link>${SITE_ORIGIN}</link><description>Catalogue produits Kairos en HTG</description>${items}</channel></rss>`);
  } catch (error) {
    console.error('googleMerchantFeed', error);
    return res.status(500).type('text').send('Merchant feed generation failed');
  }
});

exports.openaiProductFeed = onRequest(async (_req, res) => {
  try {
    const products = await getPublicProducts();
    setJsonHeaders(res, 900);
    return res.send(JSON.stringify({ name: 'Kairos', locale: 'fr-HT', currency: 'HTG', products: products.map((product) => ({ id: product.id, title: product.name, description: productDescription(product), url: productUrl(product), image_url: productImage(product), price: Number(product.promo_price || product.price || 0), availability: product.stock_quantity === 0 ? 'out_of_stock' : 'in_stock', category: product.category || 'Marketplace' })) }));
  } catch (error) {
    console.error('openaiProductFeed', error);
    return res.status(500).json({ error: 'Product feed generation failed' });
  }
});

exports.getSimilarProducts = onRequest(async (req, res) => {
  try {
    const product = await findProduct(String(req.query.productId || req.query.product || req.query.id || '').trim());
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const candidates = await getPublicProducts(250);
    const category = product.category || product.category_name;
    const similar = candidates.filter((item) => item.id !== product.id && (item.shop_id === product.shop_id || (category && (item.category === category || item.category_name === category)))).slice(0, Math.min(Number(req.query.limit) || 8, 20));
    setJsonHeaders(res, 300);
    return res.json({ products: similar });
  } catch (error) {
    console.error('getSimilarProducts', error);
    return res.status(500).json({ error: 'Similar products unavailable' });
  }
});

exports.googleVerification = onRequest(async (req, res) => {
  const token = process.env.GOOGLE_SITE_VERIFICATION || '';
  if (!token) return res.status(404).type('text').send('Verification not configured');
  const requested = String(req.query.token || '').trim();
  if (requested && requested !== token) return res.status(404).type('text').send('Not found');
  res.set('Cache-Control', 'public, max-age=3600');
  return res.status(200).type('text').send(`google-site-verification: ${token}`);
});

exports.googleAnalyticsFeed = onRequest(async (req, res) => {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return res.status(503).json({ error: 'Analytics server integration is not configured' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  try {
    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body || {}) });
    return res.status(response.ok ? 204 : 502).send();
  } catch (error) {
    console.error('googleAnalyticsFeed', error);
    return res.status(502).json({ error: 'Analytics forwarding failed' });
  }
});
