import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// APP_URL doit correspondre exactement au domaine public de l'app
const APP_URL = (Deno.env.get('APP_URL') || 'https://rapido-presto.base44.app').replace(/\/$/, '');

function getOptimizedImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (!imageUrl.startsWith('http')) imageUrl = `${APP_URL}${imageUrl}`;
  // Pour images Supabase: redimensionner à 600x600, qualité 75 → garantit < 300KB pour WhatsApp
  if (imageUrl.includes('supabase.co/storage')) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}width=600&height=600&quality=75&resize=contain`;
  }
  return imageUrl;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);

    // Lire les params depuis URL query string OU body JSON
    let shopSlug = url.searchParams.get('slug');
    let productSlug = url.searchParams.get('product');
    let productId = url.searchParams.get('product_id');

    // Fallback: lire depuis le body si params absents de l'URL
    if (!shopSlug && !productSlug && !productId && req.method === 'POST') {
      try {
        const body = await req.json();
        shopSlug = body.slug || body.shopSlug;
        productSlug = body.product || body.productSlug;
        productId = body.product_id || body.productId;
      } catch (_) {}
    }

    if (!shopSlug && !productId) {
      return new Response('Paramètre slug requis', { status: 400 });
    }

    let shop = null;
    let product = null;
    let productPrice = null;

    if (shopSlug) {
      const shops = await base44.asServiceRole.entities.Shop.filter({ slug: shopSlug });
      shop = shops[0];
    }

    if (productSlug && shop) {
      const products = await base44.asServiceRole.entities.Product.filter({
        shop_id: shop.id,
        slug: productSlug
      });
      product = products[0];
    } else if (productId) {
      const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
      product = products[0];
      if (product && !shop) {
        const shops = await base44.asServiceRole.entities.Shop.filter({ id: product.shop_id });
        shop = shops[0];
      }
    }

    if (product) {
      const basePrice = product.promo_price && product.promo_price < product.price
        ? product.promo_price
        : product.price;
      productPrice = Math.round(basePrice * 1.10);
    }

    const appPageUrl = product
      ? `${APP_URL}/ShopView?slug=${shop?.slug || ''}&product=${product.slug || product.id}`
      : `${APP_URL}/ShopView?slug=${shopSlug}`;

    const ogUrl = product
      ? `${APP_URL}/functions/ogMetaTags?slug=${shop?.slug || ''}&product=${product.slug || product.id}`
      : `${APP_URL}/functions/ogMetaTags?slug=${shopSlug}`;

    const pageTitle = product
      ? `${escapeHtml(product.name)} — ${productPrice?.toLocaleString()} HTG`
      : escapeHtml(shop?.company_name || 'Rapido Presto');

    const pageDescription = product
      ? escapeHtml(`${product.description || product.name} · Prix: ${productPrice?.toLocaleString()} HTG · ${shop?.company_name || ''}`)
      : escapeHtml(`Découvrez ${shop?.company_name} sur Rapido Presto. ${shop?.company_category || ''} en Haïti.`);

    const rawImage = product?.image_url || shop?.company_logo_url || '';
    const pageImage = getOptimizedImageUrl(rawImage);

    // Détecter les crawlers pour la redirection (humains → app React)
    // IMPORTANT: On sert TOUJOURS le HTML avec OG tags — WhatsApp, Facebook et autres bots
    // ont des UA variés. La redirection JS ne fonctionne pas pour les crawlers.
    const userAgent = req.headers.get('user-agent') || '';
    const isHuman = /Mozilla.*(?:Chrome|Firefox|Safari|Edge|Opera)/i.test(userAgent)
      && !/bot|crawl|spider|facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot/i.test(userAgent);

    // Si humain (navigateur réel) → redirection immédiate vers l'app
    if (isHuman) {
      return Response.redirect(appPageUrl, 302);
    }

    // Pour TOUS les autres (crawlers, bots, WhatsApp, accès direct) → HTML avec OG tags
    const html = `<!DOCTYPE html>
<html lang="fr" prefix="og: https://ogp.me/ns# product: https://ogp.me/ns/product#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} - Rapido Presto</title>
  <meta name="description" content="${pageDescription}">

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="fb:app_id" content="1346505637253912" />
  <meta property="og:type" content="${product ? 'product' : 'website'}" />
  <meta property="og:site_name" content="Rapido Presto" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${pageDescription}" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:locale" content="fr_HT" />
  ${pageImage ? `<meta property="og:image" content="${pageImage}" />
  <meta property="og:image:secure_url" content="${pageImage}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="600" />
  <meta property="og:image:alt" content="${pageTitle}" />
  <meta property="og:image:type" content="image/jpeg" />` : ''}

  ${product ? `<meta property="product:price:amount" content="${productPrice}" />
  <meta property="product:price:currency" content="HTG" />
  <meta property="product:availability" content="in stock" />
  <meta property="product:brand" content="${escapeHtml(shop?.company_name || '')}" />
  <meta property="product:condition" content="new" />` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="${pageDescription}" />
  ${pageImage ? `<meta name="twitter:image" content="${pageImage}" />` : ''}

  <!-- Rediriger les humains vers l'app -->
  <script>
    var ua = navigator.userAgent || '';
    var isBot = /bot|crawl|facebookexternalhit|WhatsApp|Telegram|Slack|Discord/i.test(ua);
    if (!isBot) { window.location.replace('${appPageUrl}'); }
  </script>
</head>
<body>
  <div style="max-width:600px;margin:40px auto;padding:20px;font-family:system-ui,sans-serif;text-align:center;">
    <h1 style="font-size:1.4rem;margin-bottom:8px;">${pageTitle}</h1>
    <p style="color:#666;margin-bottom:16px;">${pageDescription}</p>
    ${pageImage ? `<img src="${pageImage}" alt="${pageTitle}" style="max-width:100%;height:auto;border-radius:8px;margin-bottom:20px;" />` : ''}
    <a href="${appPageUrl}" style="display:inline-block;background:#f97316;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1rem;">
      Commander sur Rapido Presto →
    </a>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate', // Force WhatsApp/Facebook to re-scrape
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('ogMetaTags error:', error);
    return new Response(`<html><body><p>Erreur: ${error.message}</p></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
});