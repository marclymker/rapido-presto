import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Vérifier que l'utilisateur est admin
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Récupérer tous les produits
    const products = await base44.asServiceRole.entities.Product.list();
    
    let migratedCount = 0;
    const errors = [];

    // Migrer les produits qui ont subCategory au lieu de subcategory
    for (const product of products) {
      try {
        // Si le produit a subCategory, le copier vers subcategory
        if (product.subCategory && !product.subcategory) {
          await base44.asServiceRole.entities.Product.update(product.id, {
            subcategory: product.subCategory
          });
          migratedCount++;
        }
      } catch (error) {
        errors.push({ product_id: product.id, error: error.message });
      }
    }

    return Response.json({ 
      success: true, 
      message: `${migratedCount} produits migrés avec succès`,
      migrated: migratedCount,
      total: products.length,
      errors: errors
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});