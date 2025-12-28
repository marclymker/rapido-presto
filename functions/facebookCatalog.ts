import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Récupération de tous les produits en mode service role
    const products = await base44.asServiceRole.entities.Product.list();

    if (!products || products.length === 0) {
       return new Response("id,title\nINFO,Aucun produit trouvé dans la base", { 
         headers: { "Content-Type": "text/csv" } 
       });
    }

    let csv = 'id,title,description,availability,condition,price,link,image_link,brand\n';

    const escapeCSV = (str) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/\n|\r/g, ' ')}"`;
    };

    products.forEach(p => {
      // On s'assure d'avoir une URL d'image (Meta l'exige)
      const img = p.image_url || p.image || "https://rapidopresto.shop/logo.png";
      const price = `${parseFloat(p.price || 0).toFixed(2)} HTG`;
      const link = `https://rapidopresto.shop/product?id=${p.id}`;
      
      csv += `${p.id},${escapeCSV(p.name)},${escapeCSV(p.description || "Produit Rapido Presto")},in stock,new,${price},${link},${img},${escapeCSV(p.shop_name || "Rapido Presto")}\n`;
    });

    return new Response(csv, { 
      headers: { 
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=catalog.csv"
      } 
    });

  } catch (err) {
    return new Response(`id,title\nERROR,"${err.message}"`, { 
      headers: { "Content-Type": "text/csv" } 
    });
  }
});