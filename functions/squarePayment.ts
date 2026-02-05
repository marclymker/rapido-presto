import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Environment } from 'npm:square';
import { checkRateLimit, rateLimitResponse, PAYMENT_MAX_REQUESTS } from './rateLimiter.js';
import { validateInput, squarePaymentSchema } from './validationSchemas.js';

Deno.serve(async (req) => {
  // SÉCURITÉ: CORS restreint à l'origine de l'app
  const allowedOrigin = Deno.env.get('APP_URL') || 'https://rapido-presto.base44.app';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // SÉCURITÉ: Rate limiting sur les paiements
    const rateLimit = checkRateLimit(req, 'square-payment', PAYMENT_MAX_REQUESTS);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const body = await req.json();
    
    // SÉCURITÉ: Validation Zod des entrées
    const validation = validateInput(squarePaymentSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error, details: validation.details }, { status: 400, headers });
    }

    const { sourceId, amount, orderId } = validation.data;

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