import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Mapping: ancienne catégorie du site → ID Facebook/Google Taxonomy officiel
 * Basé strictement sur le document fourni (6 catégories racines officielles)
 */
const CATEGORY_MAP = {
  // Vêtements et accessoires (166)
  'Pour Femme':     { id: 166, path: 'Vêtements et accessoires' },
  'Pour homme':     { id: 166, path: 'Vêtements et accessoires' },
  'Bijoux':         { id: 209, path: 'Vêtements et accessoires > Bijoux et montres > Bijoux' },

  // Maison et jardin (436)
  'Maison':         { id: 436, path: 'Maison et jardin' },
  'Matériels Décor':{ id: 436, path: 'Maison et jardin' },

  // Électronique (222)
  'Electronics':    { id: 222, path: 'Électronique' },

  // Santé et beauté (469)
  'Pharmacie':      { id: 469, path: 'Santé et beauté' },

  // Jeux et jouets (1239)
  'Bébé':           { id: 1239, path: 'Jeux et jouets' },

  // Alimentation → pas de catégorie officielle, on mappe vers la plus proche
  'Fastfood':       { id: 469, path: 'Santé et beauté' }, // fallback
  'Restaurants':    { id: 469, path: 'Santé et beauté' }, // fallback
  'Epicerie':       { id: 469, path: 'Santé et beauté' }, // fallback
  'Café':           { id: 469, path: 'Santé et beauté' }, // fallback

  // Mariage → Bijoux (211) comme meilleure correspondance officielle
  'Mariage':        { id: 211, path: 'Vêtements et accessoires > Bijoux et montres > Bijoux > Bagues' },

  // Outils → Véhicules et pièces (888) comme plus proche
  'Outils':         { id: 888, path: 'Véhicules et pièces' },

  // Boutique Fleurs → Maison et jardin (436)
  'Boutique Fleurs':{ id: 436, path: 'Maison et jardin' },
};

/**
 * Mapping subcategory → ID plus précis pour le mariage
 */
const SUBCATEGORY_MAP = {
  'Bague de Mariage':        { id: 211, path: 'Vêtements et accessoires > Bijoux et montres > Bijoux > Bagues' },
  'Bague':                   { id: 211, path: 'Vêtements et accessoires > Bijoux et montres > Bijoux > Bagues' },
  'Colliers et pendentifs':  { id: 210, path: 'Vêtements et accessoires > Bijoux et montres > Bijoux > Colliers et pendentifs' },
  'Boucles d\'oreilles':     { id: 212, path: 'Vêtements et accessoires > Bijoux et montres > Bijoux > Boucles d\'oreilles' },
  'Robe Sirène':             { id: 166, path: 'Vêtements et accessoires' },
  'Robe Catalina':           { id: 166, path: 'Vêtements et accessoires' },
  'Robe Ponpon (Princesse)': { id: 166, path: 'Vêtements et accessoires' },
  'Robe de Cérémonie':       { id: 166, path: 'Vêtements et accessoires' },
  'Demoiselle d\'honneur':   { id: 166, path: 'Vêtements et accessoires' },
  'Témoins':                 { id: 166, path: 'Vêtements et accessoires' },
  'Accessoires':             { id: 166, path: 'Vêtements et accessoires' },
  'Matériels Décor':         { id: 436, path: 'Maison et jardin' },
  'Carte et programmation':  { id: 436, path: 'Maison et jardin' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    let page = 0;
    const pageSize = 50;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let hasMore = true;

    while (hasMore) {
      const products = await base44.asServiceRole.entities.Product.list('-created_date', pageSize, page * pageSize);

      if (!products || products.length === 0) {
        hasMore = false;
        break;
      }

      for (const product of products) {
        // Déterminer la bonne catégorie FB
        let mapping = null;

        // Priorité 1: sous-catégorie (plus précise)
        if (product.subcategory && SUBCATEGORY_MAP[product.subcategory]) {
          mapping = SUBCATEGORY_MAP[product.subcategory];
        }
        // Priorité 2: catégorie principale
        else if (product.category && CATEGORY_MAP[product.category]) {
          mapping = CATEGORY_MAP[product.category];
        }

        if (!mapping) {
          totalSkipped++;
          continue;
        }

        // Ne pas écraser si déjà correct
        if (product.fb_category_id === mapping.id) {
          totalSkipped++;
          continue;
        }

        try {
          await base44.asServiceRole.entities.Product.update(product.id, {
            fb_category_id: mapping.id,
            fb_category_path: mapping.path,
          });
          totalUpdated++;
          await new Promise(r => setTimeout(r, 50)); // rate limiting
        } catch (err) {
          console.error(`Error updating ${product.id}:`, err.message);
        }
      }

      if (products.length < pageSize) {
        hasMore = false;
      } else {
        page++;
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return Response.json({
      success: true,
      updated: totalUpdated,
      skipped: totalSkipped,
      message: `Migration terminée: ${totalUpdated} mis à jour, ${totalSkipped} ignorés (déjà corrects ou sans mapping)`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});