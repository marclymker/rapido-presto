import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch all active products and shops
        const products = await base44.asServiceRole.entities.Product.filter({ is_available: true });
        const shops = await base44.asServiceRole.entities.Shop.filter({ is_active: true });

        // Create shop lookup map
        const shopMap = {};
        shops.forEach(shop => {
            shopMap[shop.id] = shop;
        });

        // Generate XML feed for Google Merchant Center
        const items = products.map(product => {
            const shop = shopMap[product.shop_id];
            if (!shop) return null;

            const price = product.promo_price && product.promo_price < product.price 
                ? product.promo_price 
                : product.price;

            const productUrl = `https://rapido-presto.base44.app/product?slug=${product.slug || product.id}`;
            const imageUrl = product.image_url || '';

            // Map category to Google product category
            const categoryMap = {
                'Pour Femme': 'Apparel & Accessories > Clothing > Dresses',
                'Pour homme': 'Apparel & Accessories > Clothing',
                'Mariage': 'Apparel & Accessories > Clothing > Wedding & Bridal Party Dresses',
                'Bijoux': 'Apparel & Accessories > Jewelry',
                'Electronics': 'Electronics',
                'Maison': 'Home & Garden',
                'Bébé': 'Baby & Toddler > Baby Clothing',
                'Fastfood': 'Food, Beverages & Tobacco > Food Items',
                'Restaurants': 'Food, Beverages & Tobacco > Food Items',
                'Epicerie': 'Food, Beverages & Tobacco > Food Items',
                'Pharmacie': 'Health & Beauty > Health Care',
                'Boutique Fleurs': 'Home & Garden > Plants > Flowers',
            };

            const googleCategory = categoryMap[product.category] || 'General Merchandise';

            return `
    <item>
        <g:id>${product.id}</g:id>
        <g:title><![CDATA[${product.name}]]></g:title>
        <g:description><![CDATA[${product.description || product.name}]]></g:description>
        <g:link>${productUrl}</g:link>
        <g:image_link>${imageUrl}</g:image_link>
        <g:availability>${product.stock_quantity > 0 ? 'in stock' : 'out of stock'}</g:availability>
        <g:price>${price} HTG</g:price>
        <g:brand><![CDATA[${shop.company_name}]]></g:brand>
        <g:condition>new</g:condition>
        <g:google_product_category>${googleCategory}</g:google_product_category>
        <g:product_type>${product.category}</g:product_type>
        ${product.product_attributes?.gtin ? `<g:gtin>${product.product_attributes.gtin}</g:gtin>` : ''}
        ${product.product_attributes?.mpn ? `<g:mpn>${product.product_attributes.mpn}</g:mpn>` : ''}
        ${product.product_attributes?.color ? `<g:color>${product.product_attributes.color}</g:color>` : ''}
        ${product.product_attributes?.size ? `<g:size>${product.product_attributes.size}</g:size>` : ''}
        ${product.product_attributes?.gender ? `<g:gender>${product.product_attributes.gender}</g:gender>` : ''}
        ${product.product_attributes?.age_group ? `<g:age_group>${product.product_attributes.age_group}</g:age_group>` : ''}
    </item>`;
        }).filter(Boolean).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Rapido Presto - Catalogue Produits</title>
    <link>https://rapido-presto.base44.app</link>
    <description>Catalogue de produits Rapido Presto pour Google Merchant Center</description>
${items}
  </channel>
</rss>`;

        return new Response(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});