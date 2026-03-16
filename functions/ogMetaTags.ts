import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Service de génération de Meta Tags Open Graph pour crawlers sociaux
 * Détecte les bots (WhatsApp, Facebook, Twitter) et sert du HTML statique avec Meta Tags
 * Pour les utilisateurs normaux, retourne une redirection vers l'app React
 * 
 * IMPORTANT: Les URLs partagées sur WhatsApp doivent pointer vers cette fonction
 * Format: /functions/ogMetaTags?slug=SHOP_SLUG&product=PRODUCT_SLUG
 */

const APP_URL = Deno.env.get('APP_URL') || 'https://rapidopresto.shop';

function getOptimizedImageUrl(imageUrl) {
  if (!imageUrl) return '';
  
  // S'assurer URL absolue
  if (!imageUrl.startsWith('http')) {
    imageUrl = `${APP_URL}${imageUrl}`;
  }
  
  // Pour les images Supabase, ajouter les paramètres de transformation
  // width=1200 height=630 pour OG (ratio standard), qualité réduite pour WhatsApp (<300KB)
  if (imageUrl.includes('supabase.co/storage')) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}width=800&height=800&quality=70&resize=contain`;
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
    
    const shopSlug = url.searchParams.get('slug');
    const productSlug = url.searchParams.get('product');
    const productId = url.searchParams.get('product_id');
    
    if (!shopSlug && !productId) {
      return new Response('Shop slug or product_id required', { status: 400 });
    }

    let shop = null;
    let product = null;
    let productPrice = null;

    // Charger la boutique par slug
    if (shopSlug) {
      const shops = await base44.asServiceRole.entities.Shop.filter({ slug: shopSlug });
      shop = shops[0];
    }

    // Charger le produit
    if (productSlug && shop) {
      const products = await base44.asServiceRole.entities.Product.filter({ 
        shop_id: shop.id, 
        slug: productSlug 
      });
      product = products[0];
    } else if (productId) {
      // Chercher par ID direct
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

    // URL de la page produit dans l'app React
    const appPageUrl = product
      ? `${APP_URL}/ShopView?slug=${shop?.slug || ''}&product=${product.slug || product.id}`
      : `${APP_URL}/ShopView?slug=${shopSlug}`;

    // URL de partage (pointe vers cette fonction pour les previews)
    const shareUrl = product
      ? `${APP_URL}/functions/ogMetaTags?slug=${shop?.slug || ''}&product=${product.slug || product.id}`
      : `${APP_URL}/functions/ogMetaTags?slug=${shopSlug}`;

    // Titres et descriptions
    const pageTitle = product 
      ? `${escapeHtml(product.name)} — ${productPrice?.toLocaleString()} HTG`
      : escapeHtml(shop?.company_name || 'Rapido Presto');
    
    const pageDescription = product
      ? escapeHtml(`${product.description || product.name} · Prix: ${productPrice?.toLocaleString()} HTG · ${shop?.company_name || ''}`)
      : escapeHtml(`Découvrez ${shop?.company_name} sur Rapido Presto. ${shop?.company_category || ''} en Haïti.`);
    
    // Image optimisée pour WhatsApp (< 300KB, URL absolue)
    const rawImage = product?.image_url || shop?.company_logo_url || '';
    const pageImage = getOptimizedImageUrl(rawImage);

    // Détecter les crawlers sociaux
    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Pinterest|Discordbot|bot/i.test(userAgent);

    // Pour les crawlers → HTML statique avec OG tags
    // Pour les humains → redirection immédiate vers l'app React
    if (!isCrawler) {
      return Response.redirect(appPageUrl, 302);
    }

    const html = `<!DOCTYPE html>
<html lang="fr" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} - Rapido Presto</title>
  <meta name="description" content="${pageDescription}">
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="${product ? 'product' : 'website'}" />
  <meta property="og:site_name" content="Rapido Presto" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${pageDescription}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:locale" content="fr_HT" />
  ${pageImage ? `
  <meta property="og:image" content="${pageImage}" />
  <meta property="og:image:secure_url" content="${pageImage}" />
  <meta property="og:image:width" content="800" />
  <meta property="og:image:height" content="800" />
  <meta property="og:image:alt" content="${pageTitle}" />
  <meta property="og:image:type" content="image/jpeg" />` : ''}
  
  ${product ? `
  <!-- Product Meta -->
  <meta property="product:price:amount" content="${productPrice}" />
  <meta property="product:price:currency" content="HTG" />
  <meta property="product:availability" content="in stock" />
  <meta property="product:brand" content="${escapeHtml(shop?.company_name || '')}" />
  <meta property="product:condition" content="new" />
  <meta property="product:retailer_item_id" content="${product.id}" />` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@RapidoPrestoHT" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="${pageDescription}" />
  ${pageImage ? `
  <meta name="twitter:image" content="${pageImage}" />
  <meta name="twitter:image:alt" content="${pageTitle}" />` : ''}
</head>
<body>
  <div style="max-width:600px;margin:40px auto;padding:20px;font-family:system-ui,sans-serif;text-align:center;">
    <h1 style="font-size:1.5rem;margin-bottom:8px;">${pageTitle}</h1>
    <p style="color:#666;margin-bottom:16px;">${pageDescription}</p>
    ${pageImage ? `<img src="${pageImage}" alt="${pageTitle}" style="max-width:100%;height:auto;border-radius:8px;margin-bottom:16px;" />` : ''}
    <a href="${appPageUrl}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
      Voir sur Rapido Presto →
    </a>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=1800', // 30min cache
      }
    });

  } catch (error) {
    console.error('ogMetaTags error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});