import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { checkRateLimit, rateLimitResponse, PAYMENT_MAX_REQUESTS } from './rateLimiter.js';

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
    // SÉCURITÉ: Rate limiting sur les paiements
    const rateLimit = checkRateLimit(req, 'moncash-payment', PAYMENT_MAX_REQUESTS);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

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

    // S'assurer que le montant est un nombre entier (MonCash n'accepte pas les décimales)
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

    // MonCash exige un montant ENTIER (pas de décimales)
    const integerAmount = Math.round(cleanAmount);
    console.log('✅ Integer amount:', integerAmount, 'HTG');

    // OrderId UNIQUE: max 15 caractères alphanumériques + timestamp pour éviter les doublons
    const timestamp = Date.now().toString().slice(-6);
    const simpleOrderId = (orderId.replace(/[^a-zA-Z0-9]/g, '') + timestamp).slice(0, 15);
    console.log('📋 Clean Order ID (Unique):', simpleOrderId);

    const accessToken = await getMoncashAccessToken();
    console.log('✅ Access token obtained');
    
    // CRITICAL: returnUrl pour redirection après paiement
    const appUrl = Deno.env.get("APP_URL") || "https://rapido-presto.base44.app";
    const returnUrl = `${appUrl}/payment/callback`;
    
    // Payload MonCash - MONTANT ENTIER, ORDER ID SIMPLE, RETURN URL
    const paymentPayload = {
      amount: integerAmount,
      orderId: simpleOrderId,
      returnUrl: returnUrl
    };
    
    console.log('📦 Payment Payload (JSON):', JSON.stringify(paymentPayload, null, 2));
    console.log('🔙 Return URL:', returnUrl);
    
    // SANDBOX URL pour tests
    const createPaymentUrl = 'https://sandbox.moncashbutton.digicelgroup.com/Api/v1/CreatePayment';
    console.log('🌐 POST:', createPaymentUrl);
    
    // AbortController pour timeout de 20 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    try {
      const paymentResponse = await fetch(createPaymentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(paymentPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

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
      orderId: simpleOrderId
    });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('❌ MonCash Timeout: Pas de réponse en 20 secondes');
        return Response.json({ 
          success: false, 
          error: 'Timeout MonCash: Le serveur ne répond pas. Vérifiez vos identifiants.',
        }, { status: 504 });
      }
      throw fetchError;
    }

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