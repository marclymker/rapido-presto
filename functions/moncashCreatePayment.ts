import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MONCASH_API_URL = 'https://sandbox.moncashbutton.digicelgroup.com/Api/v1';

async function getAccessToken() {
  const clientId = Deno.env.get('MONCASH_CLIENT_ID');
  const clientSecret = Deno.env.get('MONCASH_CLIENT_SECRET');
  
  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${MONCASH_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=read,write'
  });
  
  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { orderId, amount } = await req.json();
    
    if (!orderId || !amount) {
      return Response.json({ error: 'Missing orderId or amount' }, { status: 400 });
    }
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Create payment
    const paymentResponse = await fetch(`${MONCASH_API_URL}/CreatePayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        orderId: orderId
      })
    });
    
    const paymentData = await paymentResponse.json();
    
    if (!paymentResponse.ok) {
      return Response.json({ 
        error: 'Payment creation failed', 
        details: paymentData 
      }, { status: 400 });
    }
    
    // Return payment URL and transaction ID
    return Response.json({
      success: true,
      paymentUrl: `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=${paymentData.payment_token.token}`,
      transactionId: paymentData.payment_token.token,
      mode: paymentData.mode
    });
    
  } catch (error) {
    console.error('MonCash payment error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});