import * as base44Module from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const appId = Deno.env.get('BASE44_APP_ID');
    const Base44 = base44Module.Base44 || base44Module.default || base44Module;
    const base44 = new Base44({ appId, useServiceRole: true });

    // Récupération brute de tous les produits
    const products = await base44.entities.Product.all();

    let csv = 'id,title,description,availability,condition,price,link,image_link,brand\n';

    const escapeCSV = (str) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/\n|\r/g, ' ')}"`;
    };

    products.forEach(p => {
      // LOGIQUE DE RÉCUPÉRATION DE L'IMAGE
      // On teste plusieurs noms de champs possibles dans Base44
      let img = p.image_url || p.image || p.photo || p.picture;
      
      // Si l'image est juste un nom de fichier, on ajoute le domaine (à adapter selon votre stockage)
      if (img && !img.startsWith('http')) {
        img = `https://rapidopresto.shop/storage/${img}`;
      }
      
      // Si vraiment aucune image n'est trouvée, on met un logo par défaut pour que Meta ne rejette pas tout
      if (!img) {
        img = "https://rapidopresto.shop/assets/logo.png"; 
      }

      const id = p.id;
      const title = escapeCSV(p.name);
      const description = escapeCSV(p.description || `Produit Rapido Presto`);
      const availability = 'in stock'; 
      const condition = 'new';
      const price = `${parseFloat(p.price || 0).toFixed(2)} HTG`;
      const link = `https://rapidopresto.shop/product/${p.id}`;
      const brand = escapeCSV(p.shop_name || "Rapido Presto");

      csv += `${id},${title},${description},${availability},${condition},${price},${link},${img},${brand}\n`;
    });

    return new Response(csv, { 
      headers: { 
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=catalog_fb.csv"
      } 
    });

  } catch (err) {
    return new Response(`id,title\nERROR,"${err.message}"`, { headers: { "Content-Type": "text/csv" } });
  }
});