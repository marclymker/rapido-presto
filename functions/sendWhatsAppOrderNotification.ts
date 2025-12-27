import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId } = await req.json();

    if (!orderId) {
      return Response.json({ error: 'orderId required' }, { status: 400 });
    }

    // Get order details
    const order = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!order || order.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = order[0];

    // Get shop details
    const shops = await base44.asServiceRole.entities.Shop.filter({ id: orderData.shop_id });
    if (!shops || shops.length === 0) {
      return Response.json({ error: 'Shop not found' }, { status: 404 });
    }

    const shop = shops[0];
    
    // Validate shop has phone number
    if (!shop.phone) {
      console.log('Shop has no phone number, skipping WhatsApp notification');
      return Response.json({ success: false, message: 'Shop has no phone number' });
    }

    // Format phone number (remove spaces, dashes, plus sign)
    const merchantPhone = shop.phone.replace(/[\s\-\+]/g, '');
    
    console.log('Shop:', shop.company_name);
    console.log('Original phone:', shop.phone);
    console.log('Formatted phone:', merchantPhone);
    
    // Get Meta WhatsApp credentials
    const accessToken = Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
    
    if (!accessToken || !phoneNumberId) {
      console.error('WhatsApp credentials not configured');
      return Response.json({ error: 'WhatsApp not configured' }, { status: 500 });
    }

    // Send WhatsApp message via Meta API
    const whatsappUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const messageData = {
      messaging_product: "whatsapp",
      to: merchantPhone,
      type: "template",
      template: {
        name: "order_request",
        language: {
          code: "fr"
        }
      }
    };
    
    console.log('=== WHATSAPP API CALL ===');
    console.log('URL:', whatsappUrl);
    console.log('Phone Number ID:', phoneNumberId);
    console.log('Merchant Phone:', merchantPhone);
    console.log('Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING');
    console.log('Message Data:', JSON.stringify(messageData, null, 2));

    const response = await fetch(whatsappUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    const result = await response.json();
    
    console.log('=== WHATSAPP API RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('=== WHATSAPP API ERROR ===');
      console.error('Full error:', JSON.stringify(result, null, 2));
      console.error('Error message:', result.error?.message);
      console.error('Error code:', result.error?.code);
      console.error('Error details:', result.error?.error_data);
      
      return Response.json({ 
        success: false, 
        error: result.error?.message || 'WhatsApp send failed',
        errorCode: result.error?.code,
        details: result 
      }, { status: response.status });
    }

    console.log('=== WHATSAPP SUCCESS ===');
    console.log('Message ID:', result.messages?.[0]?.id);
    return Response.json({ 
      success: true, 
      messageId: result.messages?.[0]?.id,
      phone: merchantPhone 
    });

  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});