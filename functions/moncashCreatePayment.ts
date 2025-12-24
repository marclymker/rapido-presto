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

    const { orderId, amount } = await req.json();
    
    if (!orderId || !amount) {
      return Response.json({ error: 'Missing orderId or amount' }, { status: 400 });
    }

    // Obtenir le token d'accès
    const accessToken = await getMoncashAccessToken();
    
    // Créer le paiement MonCash
    const paymentResponse = await fetch('https://sandbox.moncashbutton.digicelgroup.com/Api/v1/CreatePayment', {
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
        success: false, 
        error: paymentData.message || 'Erreur lors de la création du paiement' 
      }, { status: 400 });
    }

    // Retourner l'URL de paiement et le transaction ID
    return Response.json({
      success: true,
      paymentUrl: `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=${paymentData.payment_token.token}`,
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