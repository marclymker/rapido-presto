import { Base44 } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // CORS headers pour Meta
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Accès public sans authentification
    const base44 = new Base44({
      appId: Deno.env.get('BASE44_APP_ID'),
      useServiceRole: true
    });

    // Récupérer les boutiques Premium
    const shops = await base44.entities.Shop.filter({ 
      is_premium: true,
      boost_enabled: true,
      is_active: true
    });
    
    const shopIds = shops.map(s => s.id);

    // Récupérer les produits avec images
    const products = await base44.entities.Product.filter({ 
      is_available: true,
      shop_id: { $in: shopIds },
      image_url: { $ne: null, $ne: '' }
    });

    // Créer CSV format Facebook
    let csv = 'id,title,description,availability,condition,price,link,image_link,brand,google_product_category\n';

    products.forEach(product => {
      const escapeCSV = (str) => {
        if (!str) return '';
        str = String(str).replace(/"/g, '""');
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str}"`;
        }
        return str;
      };

      const shopName = product.shop_name || 'Rapido Presto';
      const title = escapeCSV(`${product.name} | ${shopName}`);
      const description = escapeCSV(product.description || `Achetez ${product.name} sur Rapido Presto en Haïti`);
      const availability = product.stock_quantity > 0 ? 'in stock' : 'out of stock';
      const price = `${product.price} HTG`;
      const link = `https://rapidopresto.shop/#/Home?product=${product.id}`;
      const imageLink = product.image_url;
      const brand = escapeCSV(shopName);
      
      // Mapping catégorie
      const categoryMap = {
        'Fastfood': 'Food, Beverages & Tobacco',
        'Restaurants': 'Food, Beverages & Tobacco',
        'Café': 'Food, Beverages & Tobacco',
        'Epicerie': 'Food, Beverages & Tobacco',
        'Pharmacie': 'Health & Beauty',
        'Pour Femme': 'Apparel & Accessories',
        'Pour homme': 'Apparel & Accessories',
        'Boutique Fleurs': 'Home & Garden',
        'Maison': 'Home & Garden',
        'Bébé': 'Baby & Toddler',
        'Electronics': 'Electronics',
        'Outils': 'Hardware',
        'Mariage': 'Home & Garden',
        'Bijoux': 'Apparel & Accessories'
      };
      const googleCategory = categoryMap[product.category] || 'Apparel & Accessories';

      csv += `${product.id},${title},${description},${availability},new,${price},${link},${imageLink},${brand},${googleCategory}\n`;
    });

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="catalog.csv"',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Erreur catalogue:', error);
    return new Response(`Error: ${error.message}`, { 
      status: 500,
      headers: corsHeaders
    });
  }
});