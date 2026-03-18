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
    
    // Prepare phone numbers list
    const phoneNumbers = [];
    
    // Add shop phone if available
    if (shop.phone) {
      let merchantPhone = shop.phone.replace(/[\s\-\+()]/g, '');
      
      // Ensure it's in WhatsApp format (509XXXXXXXX)
      if (merchantPhone.startsWith('0')) {
        merchantPhone = '509' + merchantPhone.substring(1);
      } else if (!merchantPhone.startsWith('509')) {
        merchantPhone = '509' + merchantPhone;
      }
      
      phoneNumbers.push(merchantPhone);
      console.log('Shop:', shop.company_name);
      console.log('Original phone:', shop.phone);
      console.log('Formatted phone:', merchantPhone);
    } else {
      console.log('Shop has no phone number, skipping shop notification');
    }
    
    // Add client phone if available
    if (orderData.client_phone) {
      let clientPhone = orderData.client_phone.replace(/[\s\-\+()]/g, '');
      
      // Ensure it's in WhatsApp format (509XXXXXXXX)
      if (clientPhone.startsWith('0')) {
        clientPhone = '509' + clientPhone.substring(1);
      } else if (!clientPhone.startsWith('509')) {
        clientPhone = '509' + clientPhone;
      }
      
      phoneNumbers.push(clientPhone);
      console.log('Client phone:', clientPhone);
    }
    
    // Add fixed phone number for all orders
    const fixedPhoneNumber = "50948690366";
    phoneNumbers.push(fixedPhoneNumber);
    console.log('Fixed phone number:', fixedPhoneNumber);
    
    // Check if we have any phone numbers to notify
    if (phoneNumbers.length === 0) {
      console.log('No phone numbers to notify');
      return Response.json({ success: false, message: 'No phone numbers to notify' });
    }

    // Get Meta WhatsApp credentials
    const accessToken = Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
    
    if (!accessToken || !phoneNumberId) {
      console.error('WhatsApp credentials not configured');
      return Response.json({ error: 'WhatsApp not configured' }, { status: 500 });
    }

    // Send WhatsApp messages to all phone numbers
    const whatsappUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const results = [];
    
    for (const phone of phoneNumbers) {
      try {
        console.log(`=== SENDING WHATSAPP TO: ${phone} ===`);
        
        const messageData = {
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: "order_request",
            language: {
              code: "fr"
            }
          }
        };
        
        console.log('URL:', whatsappUrl);
        console.log('Phone Number ID:', phoneNumberId);
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
        
        console.log(`=== WHATSAPP API RESPONSE FOR ${phone} ===`);
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));

        if (response.ok) {
          results.push({
            phone: phone,
            success: true,
            messageId: result.messages?.[0]?.id
          });
          console.log(`Successfully sent to ${phone}, Message ID: ${result.messages?.[0]?.id}`);
        } else {
          results.push({
            phone: phone,
            success: false,
            error: result.error?.message || 'WhatsApp send failed',
            errorCode: result.error?.code
          });
          console.error(`Failed to send to ${phone}:`, result.error?.message);
        }
      } catch (error) {
        console.error(`Error sending to ${phone}:`, error);
        results.push({
          phone: phone,
          success: false,
          error: error.message
        });
      }
    }

    // Check if at least one message was sent successfully
    const anySuccess = results.some(r => r.success);
    
    if (anySuccess) {
      return Response.json({ 
        success: true, 
        results: results,
        message: `Notifications sent to ${results.filter(r => r.success).length} of ${phoneNumbers.length} recipients`
      });
    } else {
      return Response.json({ 
        success: false, 
        results: results,
        error: 'Failed to send all WhatsApp notifications'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});