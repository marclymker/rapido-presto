import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getMoncashAccessToken() {
  const clientId = Deno.env.get("MONCASH_CLIENT_ID");
  const clientSecret = Deno.env.get("MONCASH_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("Configuration MonCash manquante (CLIENT_ID ou CLIENT_SECRET)");
  }
  
  const authString = btoa(`${clientId}:${clientSecret}`);
  
  // URL SANDBOX (Changer pour LIVE en production)
  const response = await fetch('https://sandbox.moncashbutton.digicelgroup.com/Api/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=read,write'
  });
  
  const data = await response.json();
  if (!data.access_token) {
    console.error("Erreur Token:", data);
    throw new Error("Impossible d'obtenir le token Moncash");
  }
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Auth Check
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { orderId, amount } = body;
    
    // 2. Nettoyage (CRITIQUE POUR MONCASH)
    // On force un entier (pas de centimes) et on s'assure que c'est un nombre
    const cleanAmount = Math.floor(Number(amount));

    if (!orderId || !cleanAmount || cleanAmount < 1) {
      return Response.json({ error: 'Montant ou ID invalide' }, { status: 400 });
    }

    console.log(`Processing Moncash: Order ${orderId} for ${cleanAmount} HTG`);

    // 3. Appel API Moncash
    const accessToken = await getMoncashAccessToken();
    
    const paymentPayload = {
      amount: cleanAmount,
      orderId: orderId
    };
    
    // URL SANDBOX (Changer pour LIVE en production)
    const paymentResponse = await fetch('https://sandbox.moncashbutton.digicelgroup.com/Api/v1/CreatePayment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentResponse.json();
    
    if (!paymentResponse.ok || !paymentData.payment_token) {
      console.error('MonCash API Error:', paymentData);
      return Response.json({ 
        success: false, 
        error: paymentData.message || 'Erreur API MonCash',
        details: paymentData
      }, { status: 400 });
    }

    // 4. Génération du lien
    // URL SANDBOX (Changer pour LIVE en production)
    const redirectUrl = `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=${paymentData.payment_token.token}`;
    
    return Response.json({
      success: true,
      redirect_url: redirectUrl, // Clé standardisée pour le frontend
      token: paymentData.payment_token.token,
      orderId: orderId
    });

  } catch (error) {
    console.error('SERVER ERROR:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});