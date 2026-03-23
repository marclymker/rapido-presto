import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const baseUrl = "https://rapidopresto.shop";

  try {
    // Récupérer toutes les boutiques actives
    const shops = await base44.asServiceRole.entities.Shop.filter({ 
      is_active: true 
    });

    // Récupérer tous les produits disponibles
    const products = await base44.asServiceRole.entities.Product.filter({ 
      is_available: true 
    });

    // Début du fichier XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`;

    // Pages statiques importantes
    xml += `
  <url>
    <loc>${baseUrl}/Home</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>${baseUrl}/Orders</loc>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>${baseUrl}/Cart</loc>
    <priority>0.7</priority>
    <changefreq>daily</changefreq>
  </url>`;

    // Ajouter chaque boutique active
    shops.forEach(shop => {
      const shopUrl = `${baseUrl}/shop/${shop.id}`;
      xml += `
  <url>
    <loc>${shopUrl}</loc>
    <priority>0.9</priority>
    <changefreq>weekly</changefreq>
    <lastmod>${new Date(shop.updated_date).toISOString().split('T')[0]}</lastmod>
  </url>`;
    });

    // Ajouter chaque produit disponible avec URL correcte
    products.forEach(product => {
      const productUrl = `${baseUrl}/product?id=${product.id}`;
      xml += `
  <url>
    <loc>${productUrl}</loc>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
    <lastmod>${new Date(product.updated_date).toISOString().split('T')[0]}</lastmod>
  </url>`;
    });

    // Ajouter la page des produits
    xml += `
  <url>
    <loc>${baseUrl}/Products</loc>
    <priority>0.9</priority>
    <changefreq>daily</changefreq>
  </url>`;

    xml += `\n</urlset>`;

    // Retourner le XML avec les bons headers
    return new Response(xml, {
      status: 200,
      headers: { 
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600"
      },
    });

  } catch (error) {
    console.error('Erreur génération sitemap:', error);
    return new Response(`Erreur lors de la génération du sitemap: ${error.message}`, { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
});