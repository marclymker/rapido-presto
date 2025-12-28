// On importe tout le module sous un seul nom
import * as base44Module from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const Base44 = base44Module.Base44 || base44Module.default || base44Module;
    const base44 = new Base44({
      appId: Deno.env.get('BASE44_APP_ID'),
      useServiceRole: true
    });

    // 1. RÉCUPÉRER TOUS LES PRODUITS SANS FILTRES
    const products = await base44.entities.Product.filter({});
    console.log(`✅ Total produits: ${products.length}`);

    // 2. EN-TÊTES DU CATALOGUE
    let csv = 'id,title,description,availability,condition,price,link,image_link,brand\n';

    const escapeCSV = (str) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/\n|\r/g, ' ')}"`;
    };

    // 3. GÉNÉRATION DES LIGNES
    let count = 0;
    products.forEach(product => {
      // Ignorer uniquement ceux sans image (Meta les refuse)
      if (!product.image_url) return;

      const id = product.id;
      const title = escapeCSV(product.name);
      const description = escapeCSV(product.description || `Produit disponible sur Rapido Presto`);

      // Force 'in stock' pour affichage
      const availability = 'in stock'; 
      const condition = 'new';

      // Prix formaté
      const priceValue = parseFloat(product.price || 0).toFixed(2);
      const price = `${priceValue} HTG`;

      // URL UNIQUE - INDISPENSABLE
      const link = `https://rapidopresto.shop/product?id=${product.id}`;
      const imageLink = product.image_url;
      const brand = escapeCSV(product.shop_name || "Rapido Presto");

      csv += `${id},${title},${description},${availability},${condition},${price},${link},${imageLink},${brand}\n`;
      count++;
    });

    console.log(`✅ Catalogue généré avec ${count} produits`);

    return new Response(csv, { 
      status: 200, 
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=catalog.csv',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('ERREUR CRITIQUE:', error);
    return new Response('id,title\nERROR,Check Logs', { 
      status: 500,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' }
    });
  }
});