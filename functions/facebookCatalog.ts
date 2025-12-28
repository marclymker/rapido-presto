import * as base44Module from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // CORRECTION DE L'IMPORTATION :
    // On cherche le constructeur Base44 dans toutes les propriétés possibles du module
    const Base44 = base44Module.Base44 || base44Module.default?.Base44 || base44Module.default;

    if (typeof Base44 !== 'function') {
        throw new Error("Impossible de trouver le constructeur Base44 dans le module SDK.");
    }

    const base44 = new Base44({
      appId: Deno.env.get('BASE44_APP_ID'),
      useServiceRole: true
    });

    // Récupération de tous les produits
    const products = await base44.entities.Product.all();

    let csv = 'id,title,description,availability,condition,price,link,image_link,brand\n';

    const escapeCSV = (str) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/\n|\r/g, ' ')}"`;
    };

    products.forEach(p => {
      // Extraction de l'image (on essaie plusieurs champs si image_url est vide)
      const img = p.image_url || p.image || p.photo || "https://rapidopresto.shop/logo.png";
      
      const price = `${parseFloat(p.price || 0).toFixed(2)} HTG`;
      const link = `https://rapidopresto.shop/product/${p.id}`;
      const brand = escapeCSV(p.shop_name || "Rapido Presto");

      csv += `${p.id},${escapeCSV(p.name)},${escapeCSV(p.description)},in stock,new,${price},${link},${img},${brand}\n`;
    });

    return new Response(csv, { 
      headers: { 
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=catalog_fb.csv"
      } 
    });

  } catch (err) {
    // Affichage de l'erreur pour diagnostiquer si besoin
    return new Response(`id,title\nERROR_CONSTRUCTOR,"${err.message}"`, { 
        headers: { "Content-Type": "text/csv" } 
    });
  }
});