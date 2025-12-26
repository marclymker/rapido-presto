import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fonction pour obtenir le token d'accès MonCash
async function getMoncashAccessToken() {
  const clientId = Deno.env.get("MONCASH_CLIENT_ID");
  const clientSecret = Deno.env.get("MONCASH_CLIENT_SECRET");
  
  const authString = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://sandbox.moncashbutton.digicelgroup.com/Api/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
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
    
    // Vérifier l'authentification
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

    // Obtenir le token d'accès
    const accessToken = await getMoncashAccessToken();
    console.log('Access token obtained:', accessToken ? 'Yes' : 'No');
    
    // Créer le paiement MonCash
    const paymentPayload = {
      amount: amount,
      orderId: orderId
    };
    
    console.log('Payment payload:', paymentPayload);
    
    const paymentResponse = await fetch('https://sandbox.moncashbutton.digicelgroup.com/Api/v1/CreatePayment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentResponse.json();
    console.log('MonCash response:', paymentData);
    
    if (!paymentResponse.ok) {
      console.error('MonCash error:', paymentData);
      return Response.json({ 
        success: false, 
        error: paymentData.message || 'Erreur lors de la création du paiement',
        details: paymentData
      }, { status: 400 });
    }

    // Retourner l'URL de paiement
    const paymentUrl = `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=${paymentData.payment_token.token}`;
    
    return Response.json({
      success: true,
      payment_url: paymentUrl,
      transactionId: paymentData.payment_token.token
    });

  } catch (error) {
    console.error('MonCash payment creation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});