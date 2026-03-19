import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const MONCASH_BASE = 'https://sandbox.moncashbutton.digicelgroup.com/Api';
const MONCASH_REDIRECT = 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect';

async function getMoncashAccessToken() {
  const clientId = Deno.env.get("MONCASH_CLIENT_ID");
  const clientSecret = Deno.env.get("MONCASH_CLIENT_SECRET");
  const authString = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${MONCASH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: 'grant_type=client_credentials&scope=read,write'
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('MonCash OAuth error:', response.status, errorText);
    throw new Error(`OAuth failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error('No access token received');
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

    if (!orderId || !amount) {
      return Response.json({ success: false, error: 'orderId et amount sont requis' }, { status: 400 });
    }

    const cleanAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return Response.json({ success: false, error: 'Montant invalide' }, { status: 400 });
    }

    const integerAmount = Math.round(cleanAmount);
    const timestamp = Date.now().toString().slice(-6);
    const simpleOrderId = (orderId.replace(/[^a-zA-Z0-9]/g, '') + timestamp).slice(0, 15);

    console.log('🔑 Getting MonCash token (PRODUCTION)...');
    const accessToken = await getMoncashAccessToken();
    console.log('✅ Token obtained');

    const appUrl = Deno.env.get("APP_URL") || "https://rapido-presto.base44.app";
    const returnUrl = `${appUrl}/PaymentCallback`;

    const paymentPayload = {
      amount: integerAmount,
      orderId: simpleOrderId,
      returnUrl: returnUrl
    };

    console.log('📦 Payload:', JSON.stringify(paymentPayload));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const paymentResponse = await fetch(`${MONCASH_BASE}/v1/CreatePayment`, {
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
      console.error('❌ CreatePayment Error:', paymentResponse.status, errorText);
      return Response.json({
        success: false,
        error: `MonCash Error ${paymentResponse.status}`,
        details: errorText
      }, { status: 400 });
    }

    const paymentData = await paymentResponse.json();
    console.log('✅ MonCash Success:', JSON.stringify(paymentData));

    if (!paymentData.payment_token?.token) {
      return Response.json({
        success: false,
        error: 'Token de paiement manquant',
        details: paymentData
      }, { status: 400 });
    }

    const paymentUrl = `${MONCASH_REDIRECT}?token=${paymentData.payment_token.token}`;

    return Response.json({
      success: true,
      paymentUrl,
      transactionId: paymentData.payment_token.token,
      orderId: simpleOrderId
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return Response.json({ success: false, error: 'Timeout: MonCash ne répond pas' }, { status: 504 });
    }
    console.error('❌ Exception:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});