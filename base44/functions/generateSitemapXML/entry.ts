import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GÉNÉRATION SITEMAP.XML DYNAMIQUE
 * 
 * Expose toutes les URLs indexables :
 * - Pages produits: /products/{slug}
 * - Pages catégories: /categories/{slug}
 * - Pages boutiques: /shops/{slug}
 * - Page d'accueil
 * 
 * URL: /api/sitemap.xml
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const APP_URL = 'https://rapidopresto.shop';

    // Récupérer tous les produits actifs
    const products = await base44.asServiceRole.entities.Product.filter({ 
      is_available: true 
    }, '-updated_date', 5000);

    // Récupérer toutes les boutiques actives
    const shops = await base44.asServiceRole.entities.Shop.filter({ 
      is_active: true 
    });

    // Catégories statiques
    const categories = [
      { slug: 'mariage', name: 'Mariage' },
      { slug: 'mode-femme', name: 'Mode Femme' },
      { slug: 'fleurs', name: 'Fleurs' },
      { slug: 'electronique', name: 'Électronique' },
      { slug: 'bijoux', name: 'Bijoux' },
      { slug: 'homme', name: 'Homme' },
      { slug: 'maison', name: 'Maison' },
      { slug: 'bebe', name: 'Bébé' },
      { slug: 'outils', name: 'Outils' }
    ];

    // Construction XML
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Page d'accueil
    sitemap += `  <url>
    <loc>${APP_URL}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;

    // Pages catégories
    for (const cat of categories) {
      sitemap += `  <url>
    <loc>${APP_URL}/categories/${cat.slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }

    // Pages boutiques
    for (const shop of shops) {
      if (!shop.slug) continue;
      sitemap += `  <url>
    <loc>${APP_URL}/shops/${shop.slug}</loc>
    <lastmod>${shop.updated_date || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    }

    // Pages produits
    for (const product of products) {
      if (!product.slug) continue;
      sitemap += `  <url>
    <loc>${APP_URL}/product/${product.slug}</loc>
    <lastmod>${product.updated_date || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>\n`;
    }

    sitemap += '</urlset>';

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // Cache 1h
      }
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});