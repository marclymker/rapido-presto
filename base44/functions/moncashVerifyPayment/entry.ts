import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const MONCASH_BASE = 'https://sandbox.moncashbutton.digicelgroup.com/Api';

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
    throw new Error(`OAuth failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error('No access token received');
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { transactionId } = body;

    if (!transactionId) {
      return Response.json({ success: false, error: 'Transaction ID manquant' }, { status: 400 });
    }

    console.log('🔍 Verifying MonCash payment (PRODUCTION):', transactionId);
    const accessToken = await getMoncashAccessToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const verifyResponse = await fetch(
      `${MONCASH_BASE}/v1/RetrieveTransactionPayment?transactionId=${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const paymentData = await verifyResponse.json();
    console.log('MonCash verify response:', JSON.stringify(paymentData));

    if (!verifyResponse.ok) {
      return Response.json({
        success: false,
        error: 'Transaction non trouvée',
        details: paymentData
      }, { status: 400 });
    }

    const isSuccessful = paymentData.payment?.message === 'successful';

    return Response.json({
      success: true,
      status: isSuccessful ? 'success' : 'pending',
      transactionId,
      amount: paymentData.payment?.cost || 0,
      details: paymentData
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return Response.json({ success: false, error: 'Timeout MonCash' }, { status: 504 });
    }
    console.error('MonCash verify error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});