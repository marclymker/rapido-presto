// On importe tout le module sous un seul nom
import * as base44Module from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // On identifie dynamiquement où se trouve la classe Base44
    const Base44 = base44Module.Base44 || base44Module.default || base44Module;

    const base44 = new Base44({
      appId: Deno.env.get('BASE44_APP_ID'),
      useServiceRole: true
    });

    // 1. Récupérer TOUS les produits disponibles (sans filtrer par boutique)
    const products = await base44.entities.Product.filter({ 
      is_available: true
    });
    console.log(`✅ Produits disponibles trouvés: ${products.length}`);

    // 2. Récupérer les boutiques pour les noms
    const shops = await base44.entities.Shop.filter({ is_active: true });
    console.log(`✅ Boutiques actives: ${shops.length}`);

    // 3. Filtrer uniquement les produits avec image
    const validProducts = products.filter(p => p.image_url && p.image_url.trim() !== '');
    console.log(`✅ Produits valides avec image: ${validProducts.length}`);
    
    if (validProducts.length === 0) {
      console.error('⚠️ ALERTE: Aucun produit avec image trouvé!');
    }

    // En-têtes CSV (format Meta/Google)
    let csv = 'id,title,description,availability,condition,price,link,image_link,brand,google_product_category,quantity_to_sell_on_facebook,sale_price\n';

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const cleanStr = String(str).replace(/"/g, '""').replace(/\n|\r/g, ' ');
      return `"${cleanStr}"`;
    };

    validProducts.forEach((product, index) => {
      try {
        // Trouver le shop_name depuis l'entité Shop si null
        const shop = shops.find(s => s.id === product.shop_id);
        const shopName = product.shop_name || shop?.company_name || 'Rapido Presto';

        const id = escapeCSV(product.id);
        const title = escapeCSV(`${product.name} - ${shopName}`.substring(0, 150));
        const description = escapeCSV((product.description || `Achetez ${product.name} sur Rapido Presto`).substring(0, 5000));
        const availability = escapeCSV((product.stock_quantity || 0) > 0 ? 'in stock' : 'out of stock');
        const condition = escapeCSV('new');

        const priceRaw = parseFloat(product.price);
        const priceValue = isNaN(priceRaw) ? "0.00" : priceRaw.toFixed(2);
        const price = escapeCSV(`${priceValue} HTG`);

        const link = escapeCSV(`https://rapidopresto.shop/product?id=${product.id}`);
        const imageLink = escapeCSV(product.image_url);
        const brand = escapeCSV(shopName);
        const googleCategory = escapeCSV('Apparel & Accessories'); 
        const quantity = escapeCSV(product.stock_quantity || 0);

        let salePrice = '""';
        if (product.promo_price && parseFloat(product.promo_price) < parseFloat(product.price)) {
          salePrice = escapeCSV(`${parseFloat(product.promo_price).toFixed(2)} HTG`);
        }

        csv += `${id},${title},${description},${availability},${condition},${price},${link},${imageLink},${brand},${googleCategory},${quantity},${salePrice}\n`;
      } catch (err) {
        console.error(`Erreur produit ${index}:`, err);
      }
    });

    console.log(`✅ CSV généré avec ${validProducts.length} produits`);

    return new Response(csv, { 
      status: 200, 
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Erreur catalogue complète:', error);
    console.error('Stack:', error.stack);
    // Retourner un CSV vide mais valide avec au moins une ligne de test
    const errorCsv = 'id,title,description,availability,condition,price,link,image_link,brand,google_product_category,quantity_to_sell_on_facebook,sale_price\n';
    return new Response(errorCsv, { 
      status: 200, 
      headers: { 
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      } 
    });
  }
});