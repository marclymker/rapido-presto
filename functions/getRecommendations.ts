import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { limit = 6 } = await req.json();

    // Check if user is authenticated
    const isAuthenticated = await base44.auth.isAuthenticated();

    if (isAuthenticated) {
      // User authenticated - personalized recommendations
      const user = await base44.auth.me();
      
      // Get user's order history
      const orders = await base44.asServiceRole.entities.Order.filter(
        { client_id: user.id },
        '-created_date',
        10
      );

      // Get cart items
      const cartItems = await base44.asServiceRole.entities.CartItem.filter(
        { user_id: user.id }
      );

      // Get all available products
      const allProducts = await base44.asServiceRole.entities.Product.filter(
        { is_available: true }
      );

      if (allProducts.length === 0) {
        return Response.json({ recommendations: [] });
      }

      // Extract purchased product IDs and categories
      const purchasedProducts = orders.flatMap(o => o.items || []).map(i => i.product_id);
      const purchasedCategories = orders.flatMap(o => 
        (o.items || []).map(i => allProducts.find(p => p.id === i.product_id)?.category)
      ).filter(Boolean);

      const cartProductIds = cartItems.map(c => c.product_id);

      // Build AI prompt for personalized recommendations
      const prompt = `Tu es un expert en recommandations produits pour une marketplace haïtienne.

Historique d'achat de l'utilisateur :
- Catégories achetées: ${purchasedCategories.join(', ') || 'Aucune'}
- Nombre de commandes: ${orders.length}
- Produits dans le panier: ${cartProductIds.length}

Produits disponibles (extrait):
${allProducts.slice(0, 20).map(p => `- ${p.name} (${p.category}) - ${p.price} HTG`).join('\n')}

Recommande ${limit} produits pertinents basés sur l'historique. Retourne une liste d'IDs de produits en JSON.
Privilégie:
1. Des catégories similaires à celles achetées
2. Des produits complémentaires
3. Des nouveautés dans les catégories favorites

Format: {"product_ids": ["id1", "id2", ...]}`;

      try {
        const aiResponse = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              product_ids: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        const recommendedIds = aiResponse.product_ids || [];
        const recommendations = allProducts
          .filter(p => recommendedIds.includes(p.id))
          .slice(0, limit);

        // Fallback to random if AI returns empty or invalid
        if (recommendations.length === 0) {
          return Response.json({
            recommendations: allProducts
              .filter(p => !purchasedProducts.includes(p.id) && !cartProductIds.includes(p.id))
              .sort(() => Math.random() - 0.5)
              .slice(0, limit)
          });
        }

        return Response.json({ recommendations });
      } catch (aiError) {
        console.error('AI recommendation error:', aiError);
        // Fallback: similar categories
        const similarProducts = allProducts
          .filter(p => 
            purchasedCategories.includes(p.category) && 
            !purchasedProducts.includes(p.id) &&
            !cartProductIds.includes(p.id)
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, limit);

        return Response.json({ recommendations: similarProducts });
      }
    } else {
      // User not authenticated - trending/popular products
      const allProducts = await base44.asServiceRole.entities.Product.filter(
        { is_available: true }
      );

      if (allProducts.length === 0) {
        return Response.json({ recommendations: [] });
      }

      // Get all orders to determine popularity
      const recentOrders = await base44.asServiceRole.entities.Order.list('-created_date', 100);

      // Count product purchases
      const productPopularity = {};
      recentOrders.forEach(order => {
        (order.items || []).forEach(item => {
          productPopularity[item.product_id] = (productPopularity[item.product_id] || 0) + item.quantity;
        });
      });

      // Sort products by popularity
      const popularProducts = allProducts
        .map(p => ({
          ...p,
          popularity: productPopularity[p.id] || 0
        }))
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit);

      // If not enough popular products, add random ones
      if (popularProducts.length < limit) {
        const randomProducts = allProducts
          .filter(p => !popularProducts.find(pp => pp.id === p.id))
          .sort(() => Math.random() - 0.5)
          .slice(0, limit - popularProducts.length);
        
        popularProducts.push(...randomProducts);
      }

      return Response.json({
        recommendations: popularProducts.map(({ popularity, ...product }) => product)
      });
    }
  } catch (error) {
    console.error('Recommendations error:', error);
    return Response.json({ error: error.message, recommendations: [] }, { status: 500 });
  }
});