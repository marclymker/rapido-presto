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

    // En-tête avec tous les champs standards Facebook/Google Shopping + attributs personnalisés
    let csv = 'id,title,description,availability,condition,price,link,image_link,google_product_category,brand,color,size,material,gender,age_group,pattern,custom_label_0,custom_label_1,custom_label_2,custom_label_3,custom_label_4,additional_image_link\n';

    const escapeCSV = (str) => {
      if (!str) return '';
      return `"${String(str).replace(/"/g, '""').replace(/\n|\r/g, ' ')}"`;
    };

    products.forEach(p => {
      const attrs = p.product_attributes || {};
      
      // Champs obligatoires
      const id = p.id;
      const title = escapeCSV(p.name);
      const description = escapeCSV(p.description || "Produit Rapido Presto");
      const availability = p.is_available !== false && (p.stock_quantity === undefined || p.stock_quantity > 0) ? 'in stock' : 'out of stock';
      const condition = 'new';
      const price = `${parseFloat(p.price || 0).toFixed(2)} HTG`;
      const link = p.slug ? `https://rapido-presto.base44.app/product?slug=${p.slug}` : `https://rapido-presto.base44.app/product?id=${p.id}`;
      const image_link = p.image_url || "https://rapido-presto.base44.app/logo.png";
      const brand = escapeCSV(p.shop_name || "Rapido Presto");
      
      // Attributs produits (standards Facebook/Google Shopping)
      const color = escapeCSV(attrs.color || '');
      const size = escapeCSV(attrs.size || '');
      const material = escapeCSV(attrs.material || '');
      const gender = escapeCSV(attrs.gender || '');
      const age_group = escapeCSV(attrs.age_group || '');
      const pattern = escapeCSV(attrs.pattern || '');
      
      // Custom labels (jusqu'à 5 labels personnalisés pour filtrage)
      const custom_label_0 = escapeCSV(attrs.custom_labels?.label_0 || '');
      const custom_label_1 = escapeCSV(attrs.custom_labels?.label_1 || '');
      const custom_label_2 = escapeCSV(attrs.custom_labels?.label_2 || '');
      const custom_label_3 = escapeCSV(attrs.custom_labels?.label_3 || '');
      const custom_label_4 = escapeCSV(attrs.custom_labels?.label_4 || '');
      
      // Images supplémentaires (séparées par virgule)
      const additional_images = p.additional_images && p.additional_images.length > 0 
        ? escapeCSV(p.additional_images.join(','))
        : '';

      csv += `${id},${title},${description},${availability},${condition},${price},${link},${image_link},${brand},${color},${size},${material},${gender},${age_group},${pattern},${custom_label_0},${custom_label_1},${custom_label_2},${custom_label_3},${custom_label_4},${additional_images}\n`;
    });

    return new Response(csv, { 
      headers: { 
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=catalog.csv",
        "Cache-Control": "public, max-age=3600"
      } 
    });

  } catch (err) {
    return new Response(`id,title\nERROR,"${err.message}"`, { 
      headers: { "Content-Type": "text/csv" } 
    });
  }
});