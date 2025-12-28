// On importe tout le module sous un seul nom
import * as base44Module from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const Base44 = base44Module.Base44 || base44Module.default || base44Module;
    const base44 = new Base44({
      appId: Deno.env.get('BASE44_APP_ID'),
      useServiceRole: true
    });

    // 1. RÉCUPÉRER TOUS LES PRODUITS (sans filtres restrictifs)
    const products = await base44.entities.Product.filter({ 
      is_available: true 
    });
    console.log(`✅ Produits disponibles: ${products.length}`);

    // Filtrer uniquement ceux qui ont une image (Meta les refuse sinon)
    const validProducts = products.filter(p => p.image_url && p.image_url.trim() !== '');
    console.log(`✅ Produits avec image: ${validProducts.length}`);

    // 2. EN-TÊTES DU CATALOGUE (Format simplifié)
    let csv = 'id,title,description,availability,condition,price,link,image_link,brand\n';

    // Fonction de nettoyage CSV
    const escapeCSV = (str) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/\n|\r/g, ' ')}"`;
    };

    // 3. CONVERSION DE CHAQUE ARTICLE
    validProducts.forEach((product, idx) => {
      try {
        const id = product.id;
        const title = escapeCSV(product.name);
        const description = escapeCSV(product.description || `Produit disponible sur Rapido Presto`);
        const availability = 'in stock'; // Force in stock pour test
        const condition = 'new';

        // Format prix : "1500.00 HTG"
        const priceValue = parseFloat(product.price || 0).toFixed(2);
        const price = `${priceValue} HTG`;

        // URL UNIQUE par produit
        const link = `https://rapidopresto.shop/product?id=${product.id}`;
        const imageLink = product.image_url;
        const brand = escapeCSV(product.shop_name || "Rapido Presto");

        csv += `${id},${title},${description},${availability},${condition},${price},${link},${imageLink},${brand}\n`;
      } catch (err) {
        console.error(`Erreur produit ${idx}:`, err);
      }
    });

    console.log(`✅ CSV généré avec ${validProducts.length} lignes`);

    return new Response(csv, { 
      status: 200, 
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    // Retourner au moins l'en-tête pour éviter "Empty file"
    const headerOnly = 'id,title,description,availability,condition,price,link,image_link,brand\n';
    return new Response(headerOnly, { 
      status: 200, 
      headers: { 'Content-Type': 'text/csv; charset=utf-8' } 
    });
  }
});