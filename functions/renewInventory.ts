import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Vérifier que l'utilisateur est admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer tous les produits
    const products = await base44.asServiceRole.entities.Product.list();
    
    let updated = 0;
    const errors = [];

    // Mettre à jour par lots de 10 pour éviter surcharge
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (product) => {
          try {
            await base44.asServiceRole.entities.Product.update(product.id, {
              stock_quantity: 100
            });
            updated++;
          } catch (error) {
            errors.push({ id: product.id, name: product.name, error: error.message });
          }
        })
      );
    }

    return Response.json({
      success: true,
      total: products.length,
      updated,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});