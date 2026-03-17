import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Génère les meta tags Open Graph pour les produits
 * Optimisé pour les crawlers sociaux (WhatsApp, Facebook, etc)
 */

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const shopParam = url.searchParams.get('slug'); // peut être slug ou ID
    const productParam = url.searchParams.get('product'); // peut être slug ou ID
    
    if (!shopParam) {
      return new Response('Shop slug or ID required', { status: 400 });
    }

    // Détecter les crawlers sociaux
    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|vkshare|iframely/i.test(userAgent);
    
    console.log(`[OG] User-Agent: ${userAgent.substring(0, 80)}, isCrawler: ${isCrawler}`);

    // Initialiser Base44 SDK avec gestion d'erreur
    let base44;
    try {
      base44 = createClientFromRequest(req);
    } catch (e) {
      console.log('[OG] Pas de header Base44, crawlers externals détecté');
      // Continuer même sans le header pour les crawlers
    }

    // Charger les données en service role si le client est disponible
    let shop = null;
    let product = null;

    if (base44) {
      // Chercher la boutique par slug ou ID
      let shops = await base44.asServiceRole.entities.Shop.filter({ slug: shopParam });
      if (!shops.length) {
        shops = await base44.asServiceRole.entities.Shop.filter({ id: shopParam });
      }
      shop = shops[0];
      
      if (shop && productParam) {
        // Chercher le produit par slug ou ID
        let products = await base44.asServiceRole.entities.Product.filter({ 
          shop_id: shop.id, 
          slug: productParam 
        });
        if (!products.length) {
          products = await base44.asServiceRole.entities.Product.filter({ 
            shop_id: shop.id, 
            id: productParam 
          });
        }
        product = products[0];
      }
    }

    if (!shop) {
      return new Response('Shop not found', { status: 404 });
    }

    // Préparer les données
    const pageTitle = product 
      ? `${product.name} - ${Math.round((product.promo_price || product.price) * 1.10).toLocaleString()} HTG`
      : shop.company_name;
    
    const pageDescription = product
      ? (product.description || product.name).substring(0, 160)
      : `Découvrez ${shop.company_name}. ${shop.company_category} à ${shop.region}.`.substring(0, 160);
    
    let pageImage = product?.image_url || shop.company_logo_url || '';
    
    if (pageImage && !pageImage.startsWith('http')) {
      pageImage = `${url.origin}${pageImage}`;
    }
    
    // Optimiser l'image
    if (pageImage) {
      const separator = pageImage.includes('?') ? '&' : '?';
      pageImage = `${pageImage}${separator}w=1200&h=630&q=75&fit=crop`;
    }
    
    const pageUrl = product
      ? `${url.origin}/ShopView?slug=${shopParam}&product=${productParam}`
      : `${url.origin}/ShopView?slug=${shopParam}`;

    // Échapper les caractères HTML
    const escapeHtml = (str) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };
    
    const safeTitle = escapeHtml(pageTitle);
    const safeDescription = escapeHtml(pageDescription);

    // Servir du HTML statique aux crawlers
    if (isCrawler) {
      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  
  <!-- Open Graph Meta Tags - PRIORITÉ MAXIMALE -->
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="${product ? 'product' : 'website'}">
  ${pageImage ? `<meta property="og:image" content="${pageImage}">` : ''}
  
  <!-- Meta Description -->
  <meta name="description" content="${safeDescription}">
  <meta property="og:site_name" content="Rapido Presto">
  <meta property="og:locale" content="fr_HT">
  
  ${pageImage ? `
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:image:type" content="image/jpeg">
  ` : ''}
  
  ${product ? `
  <meta property="product:price:amount" content="${Math.round((product.promo_price || product.price) * 1.10)}">
  <meta property="product:price:currency" content="HTG">
  <meta property="product:availability" content="in stock">
  <meta property="product:brand" content="${escapeHtml(shop.company_name)}">
  ` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@RapidoPrestoHT">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  ${pageImage ? `<meta name="twitter:image" content="${pageImage}">` : ''}
  
  <!-- Redirect humains -->
  <script>
    if (typeof navigator !== 'undefined' && !/facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|vkshare|iframely/i.test(navigator.userAgent)) {
      window.location.href = '${pageUrl}';
    }
  </script>
</head>
<body style="margin: 0; padding: 0; font-family: system-ui; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
    <h1 style="color: #333;">${safeTitle}</h1>
    <p style="color: #666;">${safeDescription}</p>
    ${pageImage ? `<img src="${pageImage}" alt="${safeTitle}" style="max-width: 100%; margin: 20px 0; border-radius: 8px;">` : ''}
    <a href="${pageUrl}" style="background: #FF9900; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Voir sur Rapido</a>
  </div>
</body>
</html>`;

      console.log(`[OG] Serving crawler HTML for ${shopParam}/${productParam || 'shop'}`);
      
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN'
        }
      });
    }

    // Pour les utilisateurs normaux, rediriger
    console.log(`[OG] Redirecting human to ${pageUrl}`);
    return Response.redirect(pageUrl, 302);

  } catch (error) {
    console.error('[OG] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});