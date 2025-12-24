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
    
    const { transactionId } = await req.json();
    
    if (!transactionId) {
      return Response.json({ error: 'Missing transactionId' }, { status: 400 });
    }
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Verify payment
    const verifyResponse = await fetch(
      `${MONCASH_API_URL}/RetrieveTransactionPayment?transactionId=${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const paymentData = await verifyResponse.json();
    
    if (!verifyResponse.ok) {
      return Response.json({ 
        error: 'Payment verification failed', 
        details: paymentData 
      }, { status: 400 });
    }
    
    // Return payment status
    return Response.json({
      success: true,
      status: paymentData.payment.message,
      amount: paymentData.payment.cost,
      transactionId: paymentData.payment.transaction_id,
      orderId: paymentData.payment.reference,
      payer: paymentData.payment.payer,
      timestamp: paymentData.timestamp
    });
    
  } catch (error) {
    console.error('MonCash verification error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});