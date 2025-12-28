import { Base44 } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Permettre l'accès public pour Meta (pas besoin d'auth)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });
  }

  // Utiliser directement le service role pour accès public
  const base44 = new Base44({
    appId: Deno.env.get('BASE44_APP_ID'),
    useServiceRole: true
  });

  const baseUrl = "https://rapidopresto.shop";

  try {
    // Récupérer toutes les boutiques Premium actives
    const shops = await base44.entities.Shop.filter({ 
      is_premium: true,
      boost_enabled: true
    });
    const shopIds = shops.map(s => s.id);

    // Récupérer seulement les produits des boutiques Premium
    // ET qui ont une image (obligatoire pour Facebook)
    const products = await base44.entities.Product.filter({ 
      is_available: true,
      shop_id: { $in: shopIds },
      image_url: { $ne: null, $ne: '' }
    });

    // Si aucun produit, retourner un flux vide mais valide
    if (products.length === 0) {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Rapido Presto Product Catalog</title>
    <link>${baseUrl}</link>
    <description>Tous les produits disponibles sur Rapido Presto Haïti</description>
  </channel>
</rss>`;
      
      return new Response(emptyXml, {
        status: 200,
        headers: { 
          "Content-Type": "text/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*"
        },
      });
    }

    // Construction du header XML (format RSS 2.0 / Google Shopping)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Rapido Presto Product Catalog</title>
    <link>${baseUrl}</link>
    <description>Tous les produits disponibles sur Rapido Presto Haïti</description>`;

    // Mapping des catégories vers Google Product Categories
    const getCategoryMapping = (category) => {
      const categoryMap = {
        'Fastfood': 'Food, Beverages &amp; Tobacco',
        'Restaurants': 'Food, Beverages &amp; Tobacco',
        'Café': 'Food, Beverages &amp; Tobacco',
        'Epicerie': 'Food, Beverages &amp; Tobacco',
        'Pharmacie': 'Health &amp; Beauty',
        'Vêtements': 'Apparel &amp; Accessories',
        'Pour Femme': 'Apparel &amp; Accessories',
        'Pour homme': 'Apparel &amp; Accessories',
        'Boutique Fleurs': 'Home &amp; Garden',
        'Maison': 'Home &amp; Garden',
        'Bébé': 'Baby &amp; Toddler',
        'Electronics': 'Electronics',
        'Outils': 'Hardware'
      };
      return categoryMap[category] || 'Apparel &amp; Accessories';
    };

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

      const shopName = escapeXml(product.shop_name || 'Rapido Presto');
      const title = escapeXml(`${product.name} | ${shopName}`);
      const description = escapeXml(product.description || `Achetez ${product.name} sur Rapido Presto`);
      const imageUrl = product.image_url || '';
      const price = `${product.price} HTG`;
      const category = product.category || 'General';
      const googleCategory = getCategoryMapping(category);

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
      <g:brand>${shopName}</g:brand>
      <g:google_product_category>${googleCategory}</g:google_product_category>
      <g:product_type>${escapeXml(category)}</g:product_type>
      <g:custom_label_0>Premium_Merchant</g:custom_label_0>`;
      
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
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*"
      },
    });

  } catch (error) {
    console.error('Erreur génération flux Facebook:', error);
    return new Response(`Erreur de génération du flux: ${error.message}`, { 
      status: 500 
    });
  }
});