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
    throw new Error(`OAuth failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { transactionId } = body;
    
    console.log('Verifying MonCash payment:', transactionId);
    
    if (!transactionId) {
      return Response.json({ 
        success: false,
        error: 'Transaction ID manquant' 
      }, { status: 400 });
    }

    const accessToken = await getMoncashAccessToken();
    
    // SANDBOX URL pour tests
    // AbortController pour timeout de 15 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const verifyResponse = await fetch(
     `https://sandbox.moncashbutton.digicelgroup.com/Api/v1/RetrieveTransactionPayment?transactionId=${transactionId}`,
     {
       method: 'GET',
       headers: {
         'Authorization': `Bearer ${accessToken}`,
         'Content-Type': 'application/json',
         'Accept': 'application/json'
       },
       signal: controller.signal
     }
    );

    clearTimeout(timeoutId);

    const paymentData = await verifyResponse.json();
    console.log('MonCash verification response:', paymentData);
    
    if (!verifyResponse.ok) {
      return Response.json({ 
        success: false,
        error: 'Transaction non trouvée',
        details: paymentData
      }, { status: 400 });
    }

    // Vérifier le statut du paiement
    const isSuccessful = paymentData.payment && 
                        paymentData.payment.message === 'successful';
    
    return Response.json({
      success: true,
      status: isSuccessful ? 'success' : 'pending',
      transactionId: transactionId,
      amount: paymentData.payment?.cost || 0,
      details: paymentData
    });

  } catch (error) {
    console.error('MonCash verification error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});