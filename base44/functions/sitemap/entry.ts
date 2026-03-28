import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const baseUrl = "https://rapidopresto.shop";

  try {
    // 1. Récupération des données (Le levier de l'inventaire)
    const shops = await base44.asServiceRole.entities.Shop.filter({ 
      is_active: true 
    });

    const products = await base44.asServiceRole.entities.Product.filter({ 
      is_available: true 
    });

    // 2. Déclaration XML + Protocole Google Images (La clé d'accès)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${baseUrl}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`;

    // 3. Pages Statiques (On retire Cart et Orders pour maximiser le SEO)
    xml += `
  <url>
    <loc>${baseUrl}/Home</loc>
    <priority>0.9</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>${baseUrl}/Products</loc>
    <priority>0.9</priority>
    <changefreq>daily</changefreq>
  </url>`;

    // 4. Boucle des Boutiques
    shops.forEach(shop => {
      const shopUrl = `${baseUrl}/ShopView?id=${shop.id}`; // Ajustez si votre URL est différente
      const lastMod = shop.updated_date ? new Date(shop.updated_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `
  <url>
    <loc>${shopUrl}</loc>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
    <lastmod>${lastMod}</lastmod>
  </url>`;
    });

    // 5. Boucle des Produits AVEC IMAGES (Le résultat asymétrique)
    products.forEach(product => {
      // J'ai utilisé ProductPage car c'était le nom de votre page dans le sitemap statique
      const productUrl = `${baseUrl}/ProductPage?id=${product.id}`.replace(/&/g, '&amp;');
      const lastMod = product.updated_date ? new Date(product.updated_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      xml += `
  <url>
    <loc>${productUrl}</loc>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
    <lastmod>${lastMod}</lastmod>`;

      // INJECTION DES IMAGES POUR GOOGLE
      // Attention: Changez "image_url" et "name" selon les vrais noms de colonnes de votre Base44
      if (product.image_url) {
        const imageUrl = product.image_url.replace(/&/g, '&amp;');
        // On échappe les caractères spéciaux du nom pour éviter de casser le XML
        const imageTitle = product.name ? product.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Produit Rapido Presto';
        
        xml += `
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${imageTitle}</image:title>
    </image:image>`;
      }

      xml += `
  </url>`;
    });

    xml += `\n</urlset>`;

    // 6. Envoi de la réponse
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