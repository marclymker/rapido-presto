import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const baseUrl = "https://rapidopresto.shop";

  try {
    // Récupérer toutes les boutiques avec boost activé
    const shops = await base44.asServiceRole.entities.Shop.filter({ 
      boost_enabled: true 
    });
    const shopIds = shops.map(s => s.id);

    // Récupérer seulement les produits des boutiques avec boost activé
    // ET qui ont une image (obligatoire pour Facebook)
    const products = await base44.asServiceRole.entities.Product.filter({ 
      is_available: true,
      shop_id: { $in: shopIds },
      image_url: { $ne: null, $ne: '' }
    });

    // Construction du header XML (format RSS 2.0 / Google Shopping)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Rapido Presto Product Catalog</title>
    <link>${baseUrl}</link>
    <description>Tous les produits disponibles sur Rapido Presto Haïti</description>`;

    // Boucle sur chaque produit
    products.forEach(product => {
      // Échapper les caractères spéciaux pour XML
      const escapeXml = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const title = escapeXml(product.name);
      const description = escapeXml(product.description || `Achetez ${product.name} sur Rapido Presto`);
      const imageUrl = product.image_url || '';
      const price = `${product.price} HTG`;
      const category = product.category || 'General';

      xml += `
    <item>
      <g:id>${product.id}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${baseUrl}/product/${product.id}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${product.stock_quantity > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${price}</g:price>
      <g:brand>${escapeXml(product.shop_name || 'Rapido Presto')}</g:brand>
      <g:google_product_category>${escapeXml(category)}</g:google_product_category>
      <g:product_type>${escapeXml(category)}</g:product_type>`;
      
      // Ajouter les images supplémentaires si disponibles
      if (product.additional_images && product.additional_images.length > 0) {
        product.additional_images.forEach(img => {
          xml += `
      <g:additional_image_link>${img}</g:additional_image_link>`;
        });
      }

      xml += `
    </item>`;
    });

    xml += `
  </channel>
</rss>`;

    return new Response(xml, {
      status: 200,
      headers: { 
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      },
    });

  } catch (error) {
    console.error('Erreur génération flux Facebook:', error);
    return new Response(`Erreur de génération du flux: ${error.message}`, { 
      status: 500 
    });
  }
});