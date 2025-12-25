import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { orderId, shop_rating, delivery_rating, comment } = await req.json();

    // Validate ratings
    if (!orderId || !shop_rating || !delivery_rating) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 });
    }

    if (shop_rating < 1 || shop_rating > 5 || delivery_rating < 1 || delivery_rating > 5) {
      return Response.json({ error: 'Notes invalides (1-5)' }, { status: 400 });
    }

    // Get order details
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (orders.length === 0) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    const order = orders[0];

    // Verify order belongs to user and is delivered
    if (order.client_id !== user.id) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (order.status !== 'delivered') {
      return Response.json({ error: 'La commande doit être livrée' }, { status: 400 });
    }

    // Check if review already exists
    const existingReviews = await base44.asServiceRole.entities.Review.filter({ order_id: orderId });
    if (existingReviews.length > 0) {
      return Response.json({ error: 'Avis déjà soumis' }, { status: 400 });
    }

    // Create review
    await base44.asServiceRole.entities.Review.create({
      order_id: orderId,
      client_id: user.id,
      shop_id: order.shop_id,
      driver_id: order.driver_id || null,
      shop_rating,
      delivery_rating,
      comment: comment || ''
    });

    // Update shop average rating
    const shopReviews = await base44.asServiceRole.entities.Review.filter({ shop_id: order.shop_id });
    const shopAverage = shopReviews.reduce((acc, r) => acc + r.shop_rating, 0) / shopReviews.length;
    await base44.asServiceRole.entities.Shop.update(order.shop_id, {
      rating: Math.round(shopAverage * 10) / 10 // Round to 1 decimal
    });

    // Update driver average rating if driver exists
    if (order.driver_id) {
      const driverReviews = await base44.asServiceRole.entities.Review.filter({ driver_id: order.driver_id });
      const driverAverage = driverReviews.reduce((acc, r) => acc + r.delivery_rating, 0) / driverReviews.length;
      
      // Update user profile with driver rating
      const driverUsers = await base44.asServiceRole.entities.User.filter({ id: order.driver_id });
      if (driverUsers.length > 0) {
        const driver = driverUsers[0];
        const profiles = driver.profiles || {};
        profiles.livreur = profiles.livreur || {};
        profiles.livreur.rating = Math.round(driverAverage * 10) / 10;
        
        await base44.asServiceRole.entities.User.update(order.driver_id, {
          profiles
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Submit review error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});