import { Base44 } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Headers pour accès public
  const headers = {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const base44 = new Base44({
      appId: Deno.env.get('BASE44_APP_ID'),
      useServiceRole: true
    });

    // Récupérer boutiques Premium actives
    const shops = await base44.entities.Shop.filter({ 
      is_premium: true,
      boost_enabled: true,
      is_active: true
    });
    
    if (!shops || shops.length === 0) {
      const emptyFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Rapido Presto Catalog</title>
<link>https://rapidopresto.shop</link>
<description>Product Catalog</description>
</channel>
</rss>`;
      return new Response(emptyFeed, { status: 200, headers });
    }
    
    const shopIds = shops.map(s => s.id);

    // Récupérer produits avec images obligatoires
    const products = await base44.entities.Product.filter({ 
      is_available: true,
      shop_id: { $in: shopIds }
    });

    // Filtrer produits avec image
    const validProducts = products.filter(p => p.image_url && p.image_url.trim() !== '');

    // Construire flux RSS
    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Rapido Presto - Catalogue Produits Haiti</title>
<link>https://rapidopresto.shop</link>
<description>Tous les produits disponibles sur Rapido Presto en Haiti</description>
`;

    validProducts.forEach(product => {
      const escape = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const title = escape(`${product.name} - ${product.shop_name || 'Rapido Presto'}`);
      const desc = escape(product.description || product.name);
      const link = `https://rapidopresto.shop/#/Home`;
      const price = product.promo_price || product.price;
      const available = (product.stock_quantity || 0) > 0 ? 'in stock' : 'out of stock';
      
      const categoryMap = {
        'Fastfood': 'Food, Beverages &amp; Tobacco',
        'Restaurants': 'Food, Beverages &amp; Tobacco',
        'Café': 'Food, Beverages &amp; Tobacco',
        'Epicerie': 'Food, Beverages &amp; Tobacco',
        'Pharmacie': 'Health &amp; Beauty',
        'Pour Femme': 'Apparel &amp; Accessories',
        'Pour homme': 'Apparel &amp; Accessories',
        'Boutique Fleurs': 'Home &amp; Garden',
        'Maison': 'Home &amp; Garden',
        'Bébé': 'Baby &amp; Toddler',
        'Electronics': 'Electronics',
        'Outils': 'Hardware',
        'Mariage': 'Home &amp; Garden',
        'Bijoux': 'Apparel &amp; Accessories'
      };

      rss += `<item>
<g:id>${product.id}</g:id>
<g:title>${title}</g:title>
<g:description>${desc}</g:description>
<g:link>${link}</g:link>
<g:image_link>${product.image_url}</g:image_link>
<g:condition>new</g:condition>
<g:availability>${available}</g:availability>
<g:price>${price} HTG</g:price>
<g:brand>${escape(product.shop_name || 'Rapido Presto')}</g:brand>
<g:google_product_category>${categoryMap[product.category] || 'Apparel &amp; Accessories'}</g:google_product_category>
</item>
`;
    });

    rss += `</channel>
</rss>`;

    return new Response(rss, { status: 200, headers });

  } catch (error) {
    console.error('Error:', error);
    const errorFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Error</title>
<description>${error.message}</description>
</channel>
</rss>`;
    return new Response(errorFeed, { status: 200, headers });
  }
});