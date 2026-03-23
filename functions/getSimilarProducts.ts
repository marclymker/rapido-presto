import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { product_id, category, limit = 6 } = await req.json();

    if (!product_id) {
      return Response.json({ error: 'product_id requis' }, { status: 400 });
    }

    // Récupérer le produit actuel pour obtenir sa catégorie si non fournie
    const currentProduct = await base44.asServiceRole.entities.Product.get(product_id);
    const targetCategory = category || currentProduct?.category;

    // Filtrer les produits similaires (même catégorie, exclus le produit actuel)
    const allProducts = await base44.asServiceRole.entities.Product.filter({
      category: targetCategory,
      is_available: true
    });

    // Exclure le produit actuel et limiter les résultats
    const similarProducts = allProducts
      .filter(p => p.id !== product_id && p.image_url)
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);

    return Response.json({ data: similarProducts });
  } catch (error) {
    console.error('Erreur getSimilarProducts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});