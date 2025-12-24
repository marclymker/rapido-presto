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

    const { transactionId } = await req.json();
    
    if (!transactionId) {
      return Response.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    // Obtenir le token d'accès
    const accessToken = await getMoncashAccessToken();
    
    // Vérifier le statut du paiement
    const paymentResponse = await fetch(`https://sandbox.moncashbutton.digicelgroup.com/Api/v1/RetrieveTransactionPayment?transactionId=${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentData = await paymentResponse.json();
    
    if (!paymentResponse.ok) {
      return Response.json({ 
        success: false, 
        error: paymentData.message || 'Erreur lors de la vérification du paiement' 
      }, { status: 400 });
    }

    // Retourner le statut du paiement
    return Response.json({
      success: true,
      status: paymentData.payment.status,
      amount: paymentData.payment.cost,
      orderId: paymentData.payment.reference
    });

  } catch (error) {
    console.error('MonCash payment verification error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});