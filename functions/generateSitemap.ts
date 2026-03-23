import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Récupérer toutes les boutiques actives
    const shops = await base44.asServiceRole.entities.Shop.filter({ 
      is_active: true 
    });

    const baseUrl = "https://rapido-presto.base44.app";

    // Construire le contenu XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // Ajouter chaque boutique dynamiquement
    shops.forEach(shop => {
      xml += `
  <url>
    <loc>${baseUrl}/shop/${shop.id}</loc>
    <lastmod>${new Date(shop.updated_date || shop.created_date).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    // Renvoyer la réponse avec le bon type MIME
    return new Response(xml, {
      status: 200,
      headers: { 
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600"
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});