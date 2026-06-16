import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

      // Get user activity (views, clicks, searches)
      const activities = await base44.asServiceRole.entities.UserActivity.filter(
        { user_id: user.id },
        '-created_date',
        50
      );

      // Get all active shops
      const activeShops = await base44.asServiceRole.entities.Shop.filter(
        { is_active: true }
      );
      const activeShopIds = activeShops.map(s => s.id);

      // Get all available products from active shops
      const allProducts = await base44.asServiceRole.entities.Product.filter(
        { is_available: true }
      );

      // Filter products to only include those from active shops
      const validProducts = allProducts.filter(p => activeShopIds.includes(p.shop_id));

      if (validProducts.length === 0) {
        return Response.json({ recommendations: [] });
      }

      // Extract purchased product IDs and categories
      const purchasedProducts = orders.flatMap(o => o.items || []).map(i => i.product_id);
      const purchasedCategories = orders.flatMap(o => 
        (o.items || []).map(i => validProducts.find(p => p.id === i.product_id)?.category)
      ).filter(Boolean);

      const cartProductIds = cartItems.map(c => c.product_id);

      // Analyser les activités
      const viewedProducts = activities
        .filter(a => a.activity_type === 'product_view')
        .map(a => a.product_id);
      
      const viewedCategories = activities
        .filter(a => a.category)
        .map(a => a.category);
      
      const searchQueries = activities
        .filter(a => a.activity_type === 'search')
        .map(a => a.search_query)
        .filter(Boolean);

      // Calculer les catégories les plus intéressantes
      const categoryFrequency = {};
      [...purchasedCategories, ...viewedCategories].forEach(cat => {
        categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
      });
      const topCategories = Object.entries(categoryFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

      // Build AI prompt for personalized recommendations
      const prompt = `Tu es un expert en recommandations produits pour une marketplace haïtienne.

Profil utilisateur :
- Catégories achetées: ${purchasedCategories.join(', ') || 'Aucune'}
- Nombre de commandes: ${orders.length}
- Produits consultés récemment: ${viewedProducts.slice(0, 5).length}
- Catégories consultées: ${topCategories.join(', ') || 'Aucune'}
- Recherches récentes: ${searchQueries.slice(0, 3).join(', ') || 'Aucune'}
- Produits dans le panier: ${cartProductIds.length}

Produits disponibles (extrait):
${validProducts.slice(0, 20).map(p => `- ${p.name} (${p.category}) - ${p.price} HTG`).join('\n')}

Recommande ${limit} produits pertinents basés sur l'historique complet. Retourne une liste d'IDs de produits en JSON.
Privilégie:
1. Des catégories fréquemment consultées: ${topCategories.join(', ')}
2. Des produits liés aux recherches: ${searchQueries.slice(0, 2).join(', ')}
3. Des produits complémentaires aux achats
4. Des nouveautés dans les catégories favorites

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
        const recommendations = validProducts
          .filter(p => recommendedIds.includes(p.id))
          .slice(0, limit);

        // Fallback to random if AI returns empty or invalid
        if (recommendations.length === 0) {
          return Response.json({
            recommendations: validProducts
              .filter(p => !purchasedProducts.includes(p.id) && !cartProductIds.includes(p.id))
              .sort(() => Math.random() - 0.5)
              .slice(0, limit)
          });
        }

        return Response.json({ recommendations });
      } catch (aiError) {
        console.error('AI recommendation error:', aiError);
        // Fallback: produits des catégories top consultées
        const similarProducts = validProducts
          .filter(p => 
            (topCategories.includes(p.category) || purchasedCategories.includes(p.category)) && 
            !purchasedProducts.includes(p.id) &&
            !cartProductIds.includes(p.id) &&
            !viewedProducts.includes(p.id)
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, limit);

        return Response.json({ recommendations: similarProducts });
      }
    } else {
      // User not authenticated - trending/popular products
      // Get all active shops
      const activeShops = await base44.asServiceRole.entities.Shop.filter(
        { is_active: true }
      );
      const activeShopIds = activeShops.map(s => s.id);

      const allProducts = await base44.asServiceRole.entities.Product.filter(
        { is_available: true }
      );

      // Filter products to only include those from active shops
      const validProducts = allProducts.filter(p => activeShopIds.includes(p.shop_id));

      if (validProducts.length === 0) {
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
      const popularProducts = validProducts
        .map(p => ({
          ...p,
          popularity: productPopularity[p.id] || 0
        }))
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit);

      // If not enough popular products, add random ones
      if (popularProducts.length < limit) {
        const randomProducts = validProducts
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