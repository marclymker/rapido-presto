import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VALID_CATEGORIES = [
  'Restaurants', 'Epicerie', 'Café', 'Pharmacie', 'Maison', 'Electronics',
  'Pour Femme', 'Pour homme', 'Bijoux', 'Mariage', 'Boutique Fleurs',
  'Bébé', 'Outils', 'Matériels Décor'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default: dry run

    // Fetch all Fastfood products
    const products = await base44.asServiceRole.entities.Product.filter({ category: 'Fastfood' });
    
    if (products.length === 0) {
      return Response.json({ success: true, message: 'Aucun produit Fastfood trouvé', migrated: 0 });
    }

    const results = [];

    for (const product of products) {
      // Use AI to classify by title
      const prompt = `Tu es un expert en classification de produits e-commerce haïtien.
      
Voici le titre d'un produit : "${product.name}"
${product.description ? `Description: ${product.description}` : ''}

Classe ce produit dans UNE de ces catégories (réponds UNIQUEMENT avec le nom exact de la catégorie) :
${VALID_CATEGORIES.join(', ')}

Règles:
- Nourriture préparée (pizza, burger, poulet, etc.) → Restaurants
- Épicerie, aliments non préparés → Epicerie
- Boissons chaudes → Café
- Médicaments → Pharmacie
- Vêtements femme → Pour Femme
- Vêtements homme → Pour homme
- Si incertain → Restaurants`;

      let newCategory = 'Restaurants'; // safe default
      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
        const cleaned = (result || '').trim().replace(/['"]/g, '');
        if (VALID_CATEGORIES.includes(cleaned)) {
          newCategory = cleaned;
        }
      } catch (_) {}

      results.push({ id: product.id, name: product.name, oldCategory: 'Fastfood', newCategory });

      if (!dryRun) {
        await base44.asServiceRole.entities.Product.update(product.id, { category: newCategory });
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      total: products.length,
      results,
      message: dryRun 
        ? `Simulation: ${products.length} produits seraient migrés. Relancez avec dry_run: false pour confirmer.`
        : `${products.length} produits migrés avec succès.`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});