import { Base44 } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const headers = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const base44 = new Base44({
      appId: Deno.env.get('BASE44_APP_ID'),
      useServiceRole: true
    });

    // Récupérer boutiques Premium
    const shops = await base44.entities.Shop.filter({ 
      is_premium: true,
      boost_enabled: true,
      is_active: true
    });
    
    const shopIds = shops.map(s => s.id);

    // Récupérer produits
    const products = await base44.entities.Product.filter({ 
      is_available: true,
      shop_id: { $in: shopIds }
    });

    // Filtrer produits avec image valide
    const validProducts = products.filter(p => p.image_url && p.image_url.trim() !== '');

    // En-têtes CSV (strictement en anglais, lowercase)
    let csv = 'id,title,description,availability,condition,price,link,image_link,brand\n';

    validProducts.forEach(product => {
      // Fonction d'échappement CSV
      const escapeCSV = (str) => {
        if (!str) return '';
        str = String(str).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
        if (str.includes(',') || str.includes('"')) {
          return `"${str}"`;
        }
        return str;
      };

      // Champs obligatoires
      const id = product.id;
      const shopName = product.shop_name || 'Rapido Presto';
      const title = escapeCSV(`${product.name} - ${shopName}`.substring(0, 150));
      const description = escapeCSV((product.description || `Achetez ${product.name} sur Rapido Presto Haiti`).substring(0, 500));
      const availability = (product.stock_quantity || 0) > 0 ? 'in stock' : 'out of stock';
      const condition = 'new';
      
      // Prix au format strict: NOMBRE.DECIMALES DEVISE
      const priceValue = product.promo_price || product.price || 0;
      const price = `${parseFloat(priceValue).toFixed(2)} HTG`;
      
      // URL complète
      const link = `https://rapidopresto.shop`;
      
      // Image (obligatoire)
      const imageLink = product.image_url;
      
      // Marque
      const brand = escapeCSV(shopName);

      // Ligne CSV
      csv += `${id},${title},${description},${availability},${condition},${price},${link},${imageLink},${brand}\n`;
    });

    return new Response(csv, { status: 200, headers });

  } catch (error) {
    console.error('Error generating catalog:', error);
    // Retourner un CSV vide mais valide en cas d'erreur
    const errorCsv = 'id,title,description,availability,condition,price,link,image_link,brand\n';
    return new Response(errorCsv, { status: 200, headers });
  }
});