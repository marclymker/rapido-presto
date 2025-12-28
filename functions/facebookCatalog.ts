import { Base44 } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
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

    // En-têtes CSV avec champs optionnels
    let csv = 'id,title,description,availability,condition,price,link,image_link,brand,google_product_category,quantity_to_sell_on_facebook,sale_price\n';

    validProducts.forEach(product => {
      // Échappement CSV strict (remplace " par "" et entoure de guillemets)
      const escapeCSV = (str) => {
        if (!str) return '""';
        str = String(str).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
        return `"${str}"`;
      };

      // Mapping catégories vers Google Product Categories
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

      // Champs obligatoires
      const id = product.id;
      const shopName = product.shop_name || 'Rapido Presto';
      const title = escapeCSV(`${product.name} - ${shopName}`.substring(0, 200));
      const description = escapeCSV((product.description || `Achetez ${product.name} sur Rapido Presto Haiti`).substring(0, 500));
      const availability = (product.stock_quantity || 0) > 0 ? 'in stock' : 'out of stock';
      const condition = 'new';
      
      // Prix au format strict: NOMBRE.DECIMALES[ESPACE]DEVISE
      const priceValue = product.price || 0;
      const price = `${parseFloat(priceValue).toFixed(2)} HTG`;
      
      // URL complète
      const link = `https://rapidopresto.shop`;
      
      // Image (obligatoire)
      const imageLink = product.image_url;
      
      // Marque (toujours entre guillemets)
      const brand = escapeCSV(shopName);

      // Champs optionnels
      const googleCategory = categoryMap[product.category] || 'Apparel & Accessories';
      const quantity = product.stock_quantity || 0;
      
      // Sale price si promo active
      let salePrice = '';
      if (product.promo_price && product.promo_price < product.price) {
        salePrice = `${parseFloat(product.promo_price).toFixed(2)} HTG`;
      }

      // Ligne CSV avec tous les champs texte entre guillemets
      csv += `${id},${title},${description},${availability},${condition},${price},${link},${imageLink},${brand},${googleCategory},${quantity},${salePrice}\n`;
    });

    return new Response(csv, { status: 200, headers });

  } catch (error) {
    console.error('Error generating catalog:', error);
    // Retourner un CSV vide mais valide en cas d'erreur
    const errorCsv = 'id,title,description,availability,condition,price,link,image_link,brand,google_product_category,quantity_to_sell_on_facebook,sale_price\n';
    return new Response(errorCsv, { status: 200, headers });
  }
});