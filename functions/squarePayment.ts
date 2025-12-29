import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Environment } from 'npm:square';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const body = await req.json();
    const { sourceId, amount, orderId } = body;

    // Initialize Square client
    const client = new Client({
      accessToken: Deno.env.get('SQUARE_ACCESS_TOKEN'),
      environment: Environment.Production
    });

    // Create payment
    const { result } = await client.paymentsApi.createPayment({
      sourceId: sourceId,
      idempotencyKey: `${orderId}-${Date.now()}`,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)), // Convert to cents
        currency: 'HTG'
      },
      orderId: orderId
    });

    return Response.json({
      success: true,
      payment: result.payment
    }, { headers });

  } catch (error) {
    console.error('Square payment error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500, headers });
  }
});