import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Mapping statique : category + subcategory → fb_category_id + fb_category_path
const CATEGORY_MAPPING = {
  // Fastfood
  "Fastfood": { id: 9005, path: "Alimentation et boissons > Restauration rapide" },
  // Restaurants
  "Restaurants": { id: 9006, path: "Alimentation et boissons > Restaurant" },
  // Épicerie
  "Epicerie": { id: 9001, path: "Alimentation et boissons > Épicerie" },
  // Café
  "Café": { id: 9004, path: "Alimentation et boissons > Épicerie > Café et thé" },
  // Pharmacie
  "Pharmacie": { id: 9200, path: "Pharmacie et santé" },
  // Boutique Fleurs
  "Boutique Fleurs": { id: 9301, path: "Fleurs et cadeaux > Fleurs naturelles" },
  // Bébé
  "Bébé": { id: 9400, path: "Bébé et enfants" },
  // Outils
  "Outils": { id: 9500, path: "Outils et bricolage" },
  // Electronics
  "Electronics": { id: 222, path: "Électronique" },
  // Bijoux
  "Bijoux": { id: 209, path: "Vêtements et accessoires > Bijoux et montres > Bijoux" },
  // Maison
  "Maison": { id: 436, path: "Maison et jardin" },
  // Matériels Décor
  "Matériels Décor": { id: 9113, path: "Mariage et événements > Décoration événement > Matériels Décor" },
  // Pour Femme
  "Pour Femme": { id: 166, path: "Vêtements et accessoires" },
  // Pour homme
  "Pour homme": { id: 166, path: "Vêtements et accessoires" },
  // Mariage - par défaut (on affinera via subcategory)
  "Mariage": { id: 9100, path: "Mariage et événements" },
};

// Mapping par subcategory pour "Mariage"
const SUBCATEGORY_MAPPING = {
  "Robe Sirène":           { id: 9102, path: "Mariage et événements > Robes de mariée > Robe Sirène" },
  "Robe Catalina":         { id: 9103, path: "Mariage et événements > Robes de mariée > Robe Catalina" },
  "Robe Ponpon (Princesse)":{ id: 9104, path: "Mariage et événements > Robes de mariée > Robe Ponpon (Princesse)" },
  "Robe de Cérémonie":     { id: 9105, path: "Mariage et événements > Robes de mariée > Robe de Cérémonie" },
  "Demoiselle d'honneur":  { id: 9107, path: "Mariage et événements > Cortège > Demoiselles d'honneur" },
  "Témoins":               { id: 9108, path: "Mariage et événements > Cortège > Témoins" },
  "Bague de Mariage":      { id: 9110, path: "Mariage et événements > Bijoux de mariage > Bague de Mariage" },
  "Bague":                 { id: 9110, path: "Mariage et événements > Bijoux de mariage > Bague de Mariage" },
  "Accessoires":           { id: 9111, path: "Mariage et événements > Bijoux de mariage > Accessoires" },
  "Carte et programmation":{ id: 9114, path: "Mariage et événements > Décoration événement > Carte et programmation" },
  "Matériels Décor":       { id: 9113, path: "Mariage et événements > Décoration événement > Matériels Décor" },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let skip_offset = 0;
  const PAGE_SIZE = 100;
  const allProducts = [];

  // Charger tous les produits par pages
  while (true) {
    const batch = await base44.asServiceRole.entities.Product.list('-created_date', PAGE_SIZE, skip_offset);
    if (!batch || batch.length === 0) break;
    allProducts.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    skip_offset += PAGE_SIZE;
  }

  console.log(`Total produits trouvés: ${allProducts.length}`);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Traitement séquentiel avec délai pour éviter le rate limit
  for (const product of allProducts) {
    const cat = product.category;
    const subcat = product.subcategory;

    let mapping = null;

    // Priorité à la subcategory si disponible
    if (subcat && SUBCATEGORY_MAPPING[subcat]) {
      mapping = SUBCATEGORY_MAPPING[subcat];
    } else if (cat && CATEGORY_MAPPING[cat]) {
      mapping = CATEGORY_MAPPING[cat];
    }

    if (!mapping) {
      skipped++;
      continue;
    }

    // Ne pas écraser si déjà catégorisé correctement
    if (product.fb_category_id === mapping.id && product.fb_category_path === mapping.path) {
      skipped++;
      continue;
    }

    let retries = 3;
    while (retries > 0) {
      try {
        await base44.asServiceRole.entities.Product.update(product.id, {
          fb_category_id: mapping.id,
          fb_category_path: mapping.path,
        });
        updated++;
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          console.error(`Erreur produit ${product.id}:`, err.message);
          errors++;
        } else {
          await sleep(500); // attendre 500ms avant de réessayer
        }
      }
    }

    await sleep(100); // 100ms entre chaque update pour éviter le rate limit
  }

  const result = {
    success: true,
    total: allProducts.length,
    updated,
    skipped,
    errors,
  };

  console.log('Migration terminée:', result);
  return Response.json(result);
});