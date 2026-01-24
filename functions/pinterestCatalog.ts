import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Récupérer tous les produits actifs
    const products = await base44.asServiceRole.entities.Product.filter({ 
      is_available: true 
    });
    
    const shops = await base44.asServiceRole.entities.Shop.filter({
      is_active: true
    });
    
    // Créer un mapping des shops
    const shopsMap = {};
    shops.forEach(shop => {
      shopsMap[shop.id] = shop;
    });
    
    // Headers CSV Pinterest
    const headers = [
      'id',
      'title',
      'description',
      'link',
      'image_link',
      'price',
      'availability',
      'condition'
    ];
    
    // Construire les lignes CSV
    const rows = products.map(product => {
      const shop = shopsMap[product.shop_id];
      const price = product.promo_price || product.price;
      
      // Construire l'URL du produit
      let productUrl;
      if (shop?.slug && product.slug) {
        productUrl = `https://rapidopresto.com/shop/${shop.slug}/product/${product.slug}`;
      } else {
        productUrl = `https://rapidopresto.com/?product=${product.id}`;
      }
      
      return {
        id: product.id,
        title: (product.name || '').replace(/"/g, '""'),
        description: (product.description || product.name || '').replace(/"/g, '""'),
        link: productUrl,
        image_link: product.image_url || '',
        price: `${price} HTG`,
        availability: product.stock_quantity > 0 ? 'in stock' : 'out of stock',
        condition: 'new'
      };
    });
    
    // Générer le CSV
    let csv = headers.join(',') + '\n';
    
    rows.forEach(row => {
      const line = headers.map(header => {
        const value = row[header] || '';
        // Échapper les guillemets et entourer de guillemets si nécessaire
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value}"`;
        }
        return value;
      }).join(',');
      csv += line + '\n';
    });
    
    // Retourner le CSV avec les bons headers
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pinterest-catalog.csv"',
        'Cache-Control': 'public, max-age=3600' // Cache 1 heure
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});