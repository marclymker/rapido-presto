import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getMoncashAccessToken() {
  const clientId = Deno.env.get("MONCASH_CLIENT_ID");
  const clientSecret = Deno.env.get("MONCASH_CLIENT_SECRET");
  
  const authString = btoa(`${clientId}:${clientSecret}`);
  
  // SANDBOX URL pour tests
  const response = await fetch('https://sandbox.moncashbutton.digicelgroup.com/Api/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=read,write'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('MonCash OAuth error:', response.status, errorText);
    throw new Error(`OAuth failed: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token received');
  }
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      console.error('❌ User not authenticated');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, amount, description } = body;
    
    console.log('🔵 MonCash Payment Request:', { 
      orderId, 
      amount: typeof amount, 
      amountValue: amount, 
      description 
    });
    
    if (!orderId || !amount) {
      console.error('❌ Missing parameters:', { orderId: !!orderId, amount: !!amount });
      return Response.json({ 
        success: false,
        error: 'Missing orderId or amount' 
      }, { status: 400 });
    }

    // S'assurer que le montant est un nombre pur
    const cleanAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^0-9.]/g, ''))
      : parseFloat(amount);
    
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      console.error('❌ Invalid amount:', amount, '→', cleanAmount);
      return Response.json({ 
        success: false,
        error: 'Montant invalide' 
      }, { status: 400 });
    }

    console.log('✅ Clean amount:', cleanAmount, 'HTG');

    // Générer un ID unique avec timestamp pour éviter les doublons
    const uniqueOrderId = `${orderId}_${Date.now()}`;
    console.log('📋 Unique Order ID:', uniqueOrderId);

    const accessToken = await getMoncashAccessToken();
    console.log('✅ Access token obtained');
    
    // Payload MonCash - MONTANT PUR, PAS DE SYMBOLE
    const paymentPayload = {
      amount: cleanAmount,
      orderId: uniqueOrderId
    };
    
    console.log('📦 Payment Payload (JSON):', JSON.stringify(paymentPayload, null, 2));
    
    // SANDBOX URL pour tests
    const createPaymentUrl = 'https://sandbox.moncashbutton.digicelgroup.com/Api/v1/CreatePayment';
    console.log('🌐 POST:', createPaymentUrl);
    
    const paymentResponse = await fetch(createPaymentUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    console.log('📡 MonCash Response Status:', paymentResponse.status);

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('❌ MonCash CreatePayment Error:', {
        status: paymentResponse.status,
        statusText: paymentResponse.statusText,
        body: errorText
      });
      
      return Response.json({ 
        success: false, 
        error: `MonCash Error ${paymentResponse.status}`,
        details: errorText,
        sentPayload: paymentPayload
      }, { status: 400 });
    }

    const paymentData = await paymentResponse.json();
    console.log('✅ MonCash Success Response:', JSON.stringify(paymentData, null, 2));
    
    if (!paymentData.payment_token?.token) {
      console.error('❌ No payment token in response:', paymentData);
      return Response.json({ 
        success: false, 
        error: 'Token de paiement manquant',
        details: paymentData
      }, { status: 400 });
    }

    // SANDBOX URL pour redirection
    const paymentUrl = `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=${paymentData.payment_token.token}`;
    
    console.log('🚀 Payment URL:', paymentUrl);
    
    return Response.json({
      success: true,
      paymentUrl: paymentUrl,
      transactionId: paymentData.payment_token.token,
      orderId: uniqueOrderId
    });

  } catch (error) {
    console.error('❌ Exception in MonCash payment:', error);
    console.error('Stack trace:', error.stack);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});