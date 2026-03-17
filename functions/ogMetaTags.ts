import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Service de génération de Meta Tags Open Graph pour crawlers sociaux
 * Détecte les bots (WhatsApp, Facebook, Twitter) et sert du HTML statique avec Meta Tags
 * Pour les utilisateurs normaux, retourne une redirection vers l'app React
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    
    // Paramètres de l'URL
    const shopSlug = url.searchParams.get('slug');
    const productSlug = url.searchParams.get('product');
    
    if (!shopSlug) {
      return new Response('Shop slug required', { status: 400 });
    }

    // Détecter les crawlers sociaux (WhatsApp, Facebook, etc.)
    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|vkshare|iframely/i.test(userAgent);
    
    // Log pour débogage
    console.log(`[OG Meta Tags] User-Agent: ${userAgent.substring(0, 100)}`);
    console.log(`[OG Meta Tags] Is Crawler: ${isCrawler}, Shop: ${shopSlug}, Product: ${productSlug}`);

    // Charger les données de la boutique
    const shops = await base44.asServiceRole.entities.Shop.filter({ slug: shopSlug });
    const shop = shops[0];
    
    if (!shop) {
      return new Response('Shop not found', { status: 404 });
    }

    let product = null;
    let productPrice = null;

    // Charger le produit si spécifié
    if (productSlug) {
      const products = await base44.asServiceRole.entities.Product.filter({ 
        shop_id: shop.id, 
        slug: productSlug 
      });
      product = products[0];
      
      if (product) {
        // Calculer le prix client (avec marge)
        const basePrice = product.promo_price || product.price;
        productPrice = Math.round(basePrice * 1.10);
      }
    }

    // Si crawler détecté, servir HTML statique avec Meta Tags
    if (isCrawler) {
      const pageTitle = product 
        ? `${product.name} - ${productPrice?.toLocaleString()} HTG`
        : shop.company_name;
      
      const pageDescription = product
        ? (product.description || product.name).substring(0, 160)
        : `Découvrez ${shop.company_name} sur Rapido Presto. ${shop.company_category} à ${shop.region}.`.substring(0, 160);
      
      // Optimiser l'image pour WhatsApp (< 300 Ko, dimensions 1200x630)
      let pageImage = product?.image_url || shop.company_logo_url || '';
      
      // S'assurer que l'image est une URL absolue avec paramètres d'optimisation
      if (pageImage && !pageImage.startsWith('http')) {
        pageImage = `${url.origin}${pageImage}`;
      }
      
      // Ajouter paramètres de compression et redimensionnement
      if (pageImage) {
        const separator = pageImage.includes('?') ? '&' : '?';
        pageImage = `${pageImage}${separator}w=1200&h=630&q=75&fit=crop`;
      }
      
      console.log(`[OG Meta Tags] Image optimisée: ${pageImage?.substring(0, 100)}`);
      
      const pageUrl = product
        ? `${url.origin}/shop-view?slug=${shopSlug}&product=${productSlug}`
        : `${url.origin}/shop-view?slug=${shopSlug}`;

      // Échapper les caractères spéciaux pour HTML
      const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      
      const safeTitle = escapeHtml(pageTitle);
      const safeDescription = escapeHtml(pageDescription);

      // Générer HTML statique avec Meta Tags optimisés (PRIORITÉ MAXIMALE)
      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  
  <!-- Meta Tags CRITIQUES pour WhatsApp - EN PREMIER -->
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="${product ? 'product' : 'website'}">
  ${pageImage ? `<meta property="og:image" content="${pageImage}">` : ''}
  
  <!-- Meta Tags Secondaires -->
  <meta name="description" content="${safeDescription}">
  <meta property="og:site_name" content="Rapido Presto">
  <meta property="og:locale" content="fr_HT">
  ${pageImage ? `
  <meta property="og:image:secure_url" content="${pageImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:image:type" content="image/jpeg">
  ` : ''}
  
  ${product ? `
  <!-- Product-specific Meta Tags -->
  <meta property="product:price:amount" content="${productPrice}">
  <meta property="product:price:currency" content="HTG">
  <meta property="product:availability" content="in stock">
  <meta property="product:brand" content="${escapeHtml(shop.company_name)}">
  <meta property="product:condition" content="new">
  <meta property="product:retailer_item_id" content="${product.id}">
  ` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@RapidoPrestoHT">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  ${pageImage ? `
  <meta name="twitter:image" content="${pageImage}">
  <meta name="twitter:image:alt" content="${safeTitle}">
  ` : ''}
  
  <!-- Redirect humans to React app after 2 seconds -->
  <script>
    // Rediriger seulement les vrais utilisateurs, pas les crawlers
    setTimeout(function() {
      if (!/facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Slackbot/i.test(navigator.userAgent)) {
        window.location.href = '${pageUrl}';
      }
    }, 100);
  </script>
</head>
<body>
  <div style="text-align: center; padding: 50px; font-family: system-ui;">
    <h1>${pageTitle}</h1>
    <p>${pageDescription}</p>
    ${pageImage ? `<img src="${pageImage}" alt="${pageTitle}" style="max-width: 100%; height: auto;">` : ''}
    <p><a href="${pageUrl}">Voir sur Rapido Presto</a></p>
  </div>
</body>
</html>`;

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'base44-app-id': Deno.env.get('BASE44_APP_ID') || ''
        }
      });
    }

    // Pour les utilisateurs normaux, rediriger vers l'app React
    const redirectUrl = product
      ? `/shop-view?slug=${shopSlug}&product=${productSlug}`
      : `/shop-view?slug=${shopSlug}`;
    
    return Response.redirect(new URL(redirectUrl, url.origin), 302);

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});