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
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, amount, description } = body;
    
    console.log('MonCash payment request:', { orderId, amount, description });
    
    if (!orderId || !amount) {
      return Response.json({ error: 'Missing orderId or amount' }, { status: 400 });
    }

    const accessToken = await getMoncashAccessToken();
    console.log('Access token obtained:', accessToken ? 'Yes' : 'No');
    
    const paymentPayload = {
      amount: amount,
      orderId: orderId
    };
    
    console.log('Payment payload:', paymentPayload);
    
    // SANDBOX URL pour tests
    const paymentResponse = await fetch('https://sandbox.moncashbutton.digicelgroup.com/Api/v1/CreatePayment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('MonCash CreatePayment error:', paymentResponse.status, errorText);
      return Response.json({ 
        success: false, 
        error: `Erreur MonCash: ${paymentResponse.status}`,
        details: errorText
      }, { status: 400 });
    }

    const paymentData = await paymentResponse.json();
    console.log('MonCash response:', paymentData);
    
    if (!paymentData.payment_token?.token) {
      console.error('No payment token in response:', paymentData);
      return Response.json({ 
        success: false, 
        error: 'Token de paiement manquant',
        details: paymentData
      }, { status: 400 });
    }

    // SANDBOX URL pour tests
    const paymentUrl = `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=${paymentData.payment_token.token}`;
    
    console.log('Payment URL generated:', paymentUrl);
    
    return Response.json({
      success: true,
      paymentUrl: paymentUrl,
      transactionId: paymentData.payment_token.token,
      orderId: orderId
    });

  } catch (error) {
    console.error('MonCash payment creation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});