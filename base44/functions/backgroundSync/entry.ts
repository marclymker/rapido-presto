import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { action, userType } = await req.json();
    
    const updates = {};
    
    // Fetch relevant data based on user type
    if (userType === 'client') {
      // Client: orders and cart
      const orders = await base44.asServiceRole.entities.Order.filter({ 
        client_id: user.id 
      }, '-created_date', 20);
      
      const cartItems = await base44.asServiceRole.entities.CartItem.filter({ 
        user_id: user.id 
      });
      
      updates.orders = orders;
      updates.cartItems = cartItems;
      updates.pendingOrders = orders.filter(o => 
        !['delivered', 'cancelled'].includes(o.status)
      ).length;
    }
    
    if (userType === 'entreprise') {
      // Enterprise: shop orders and products
      const shops = await base44.asServiceRole.entities.Shop.filter({ 
        user_id: user.id 
      });
      
      if (shops.length > 0) {
        const shopId = shops[0].id;
        
        const orders = await base44.asServiceRole.entities.Order.filter({ 
          shop_id: shopId 
        }, '-created_date', 50);
        
        const products = await base44.asServiceRole.entities.Product.filter({ 
          shop_id: shopId 
        });
        
        updates.orders = orders;
        updates.products = products;
        updates.pendingOrders = orders.filter(o => o.status === 'pending').length;
        updates.activeOrders = orders.filter(o => 
          ['preparing', 'ready', 'searching_driver'].includes(o.status)
        ).length;
      }
    }
    
    if (userType === 'livreur') {
      // Driver: available and assigned orders
      const myOrders = await base44.asServiceRole.entities.Order.filter({ 
        driver_id: user.id 
      }, '-created_date', 30);
      
      const availableOrders = await base44.asServiceRole.entities.Order.filter({ 
        status: 'searching_driver'
      }, '-created_date', 20);
      
      // Filter by commune
      const filteredAvailable = availableOrders.filter(o => 
        o.shop_commune === user.commune || o.client_commune === user.commune
      );
      
      updates.myOrders = myOrders;
      updates.availableOrders = filteredAvailable;
      updates.activeDeliveries = myOrders.filter(o => 
        ['driver_assigned', 'in_delivery'].includes(o.status)
      ).length;
      updates.newAvailable = filteredAvailable.length;
    }
    
    updates.timestamp = new Date().toISOString();
    updates.success = true;
    
    return Response.json(updates);
    
  } catch (error) {
    console.error('Background sync error:', error);
    return Response.json({ 
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});