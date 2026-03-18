import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId } = await req.json();

    console.log('=== DEBUG WHATSAPP START ===');
    console.log('Order ID:', orderId);

    // Get order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return Response.json({ error: 'Order not found', orderId }, { status: 404 });
    }

    const order = orders[0];
    console.log('Order found:', {
      id: order.id,
      order_number: order.order_number,
      shop_id: order.shop_id,
      status: order.status
    });

    // Get shop
    const shops = await base44.asServiceRole.entities.Shop.filter({ id: order.shop_id });
    if (!shops || shops.length === 0) {
      return Response.json({ 
        error: 'Shop not found', 
        orderId,
        shopId: order.shop_id 
      }, { status: 404 });
    }

    const shop = shops[0];
    console.log('Shop found:', {
      id: shop.id,
      company_name: shop.company_name,
      phone: shop.phone,
      phone_type: typeof shop.phone,
      phone_exists: !!shop.phone
    });

    // Check WhatsApp credentials
    const accessToken = Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
    
    console.log('WhatsApp Credentials:', {
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING',
      phoneNumberId: phoneNumberId || 'MISSING'
    });

    // Format phone
    const formattedPhone = shop.phone ? shop.phone.replace(/[\s\-\+]/g, '') : null;
    console.log('Phone formatting:', {
      original: shop.phone,
      formatted: formattedPhone,
      length: formattedPhone?.length
    });

    return Response.json({
      success: true,
      order: {
        id: order.id,
        number: order.order_number,
        shop_id: order.shop_id
      },
      shop: {
        id: shop.id,
        name: shop.company_name,
        phone_original: shop.phone,
        phone_formatted: formattedPhone,
        phone_length: formattedPhone?.length
      },
      credentials: {
        has_access_token: !!accessToken,
        has_phone_number_id: !!phoneNumberId,
        phone_number_id: phoneNumberId
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});