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

    // Détecter les crawlers sociaux
    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Slackbot/i.test(userAgent);

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
        ? `${product.description || product.name} - Prix: ${productPrice?.toLocaleString()} Gourdes | ${shop.company_name}`
        : `Découvrez ${shop.company_name} sur Rapido Presto. ${shop.company_category} à ${shop.region}.`;
      
      // Construire URL absolue pour l'image (critique pour WhatsApp)
      let pageImage = product?.image_url || shop.company_logo_url || '';
      
      // S'assurer que l'image est une URL absolue
      if (pageImage && !pageImage.startsWith('http')) {
        pageImage = `${url.origin}${pageImage}`;
      }
      
      const pageUrl = product
        ? `${url.origin}/shop-view?slug=${shopSlug}&product=${productSlug}`
        : `${url.origin}/shop-view?slug=${shopSlug}`;

      // Générer HTML statique avec Meta Tags optimisés
      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} - Rapido Presto</title>
  <meta name="description" content="${pageDescription}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="${product ? 'product' : 'website'}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDescription}">
  <meta property="og:site_name" content="Rapido Presto">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:locale" content="fr_HT">
  ${pageImage ? `
  <meta property="og:image" content="${pageImage}">
  <meta property="og:image:secure_url" content="${pageImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${pageTitle}">
  <meta property="og:image:type" content="image/jpeg">
  ` : ''}
  
  ${product ? `
  <!-- Product-specific Meta Tags -->
  <meta property="product:price:amount" content="${productPrice}">
  <meta property="product:price:currency" content="HTG">
  <meta property="product:availability" content="in stock">
  <meta property="product:brand" content="${shop.company_name}">
  <meta property="product:condition" content="new">
  <meta property="product:retailer_item_id" content="${product.id}">
  ` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@RapidoPrestoHT">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDescription}">
  ${pageImage ? `
  <meta name="twitter:image" content="${pageImage}">
  <meta name="twitter:image:alt" content="${pageTitle}">
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
          'Cache-Control': 'public, max-age=3600'
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